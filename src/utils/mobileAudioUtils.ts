// iOS and mobile audio utility functions with enhanced iPhone TTS support
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

export const getSupportedMimeTypes = (): string[] => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav'
  ];
  
  return types.filter(type => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type));
};

export const getBestMimeType = (): string => {
  const supportedTypes = getSupportedMimeTypes();
  
  // Prefer webm for non-iOS, mp4 for iOS
  if (isIOS()) {
    return supportedTypes.find(type => type.includes('mp4')) || 
           supportedTypes.find(type => type.includes('mpeg')) || 
           supportedTypes[0] || 'audio/wav';
  } else {
    return supportedTypes.find(type => type.includes('webm')) || 
           supportedTypes[0] || 'audio/wav';
  }
};

// Singleton audio context management
class AudioContextManager {
  private audioContext: AudioContext | null = null;
  private keepAliveInterval: number | null = null;
  private isInitialized = false;
  private userInteractionCompleted = false;

  async initialize(): Promise<AudioContext | null> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return this.audioContext;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      
      this.audioContext = new AudioContextClass();
      
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      console.log('AudioContext initialized:', this.audioContext.state);
      
      return this.audioContext;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return null;
    }
  }

  async resumeIfNeeded(): Promise<boolean> {
    if (!this.audioContext) {
      await this.initialize();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed');
        return true;
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        return false;
      }
    }

    return this.audioContext?.state === 'running';
  }

  startKeepAlive(): void {
    if (this.keepAliveInterval || !isIOS()) return;

    this.keepAliveInterval = window.setInterval(async () => {
      if (this.audioContext && this.userInteractionCompleted) {
        try {
          // Play silent audio to keep context active
          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
          
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.01);
          
          console.log('Audio context keep-alive ping');
        } catch (error) {
          console.error('Keep-alive ping failed:', error);
        }
      }
    }, 30000); // Every 30 seconds
  }

  stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  setUserInteractionCompleted(completed: boolean): void {
    this.userInteractionCompleted = completed;
    if (completed) {
      // Store in localStorage for persistence
      localStorage.setItem('audioInteractionCompleted', 'true');
      this.startKeepAlive();
    }
  }

  getUserInteractionStatus(): boolean {
    return this.userInteractionCompleted || localStorage.getItem('audioInteractionCompleted') === 'true';
  }

  getState(): string {
    return this.audioContext?.state || 'not-initialized';
  }

  cleanup(): void {
    this.stopKeepAlive();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Export singleton instance
export const audioContextManager = new AudioContextManager();

export const initializeAudioContext = async (): Promise<AudioContext | null> => {
  return await audioContextManager.initialize();
};

export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    // Test if we can actually record
    const mimeType = getBestMimeType();
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    stream.getTracks().forEach(track => track.stop());
    mediaRecorder.stop();
    
    return true;
  } catch (error) {
    console.error('Microphone permission denied or not available:', error);
    return false;
  }
};

// Reusable audio element for iOS
let globalAudioElement: HTMLAudioElement | null = null;

// Enhanced audio element creation with iOS optimizations
export const createCompatibleAudio = (base64Data: string, mimeType = 'audio/mp3'): HTMLAudioElement => {
  // Reuse existing audio element on iOS to maintain session
  if (isIOS() && globalAudioElement) {
    globalAudioElement.src = `data:${mimeType};base64,${base64Data}`;
    return globalAudioElement;
  }

  const audio = new Audio();
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  
  // iOS-specific optimizations
  if (isIOS()) {
    (audio as any).playsInline = true;
    (audio as any).webkitPlaysInline = true;
    audio.controls = false;
    
    // Store as global element for reuse
    globalAudioElement = audio;
  }
  
  audio.src = `data:${mimeType};base64,${base64Data}`;
  
  return audio;
};

// Enhanced audio playback with iOS-specific handling
export const playAudioWithContext = async (audio: HTMLAudioElement): Promise<boolean> => {
  try {
    // Ensure audio context is ready
    const contextReady = await audioContextManager.resumeIfNeeded();
    if (!contextReady && isIOS()) {
      console.warn('Audio context not ready for playback');
      return false;
    }

    // Set user interaction as completed
    audioContextManager.setUserInteractionCompleted(true);

    // Attempt playback
    await audio.play();
    console.log('Audio playback started successfully');
    return true;
  } catch (error) {
    console.error('Audio playback failed:', error);
    
    // Check if this is a user interaction issue
    if (error.name === 'NotAllowedError') {
      console.log('User interaction required for audio playback');
      return false;
    }
    
    throw error;
  }
};

// Check if audio context is suspended (indicates need for user interaction)
export const isAudioContextSuspended = (): boolean => {
  return audioContextManager.getState() === 'suspended';
};

// Reset audio interaction state (for testing/debugging)
export const resetAudioInteractionState = (): void => {
  localStorage.removeItem('audioInteractionCompleted');
  audioContextManager.setUserInteractionCompleted(false);
  audioContextManager.stopKeepAlive();
};
