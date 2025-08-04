
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionTimerProps {
  durationString: string | number;
  onTimeUp: () => void;
  isActive: boolean;
}

const SessionTimer: React.FC<SessionTimerProps> = ({ durationString, onTimeUp, isActive }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse duration string to get minutes
  const getDurationInMinutes = (duration: string | number): number => {
    // Handle case where duration is passed as a number
    if (typeof duration === 'number') {
      return duration;
    }
    
    if (duration.includes('No time limit')) return 0;
    const match = duration.match(/(\d+)\s*minutes?/);
    return match ? parseInt(match[1]) : 0;
  };

  useEffect(() => {
    if (!isActive) return;

    const minutes = getDurationInMinutes(durationString);
    if (minutes === 0) return; // No time limit

    setTimeRemaining(minutes * 60); // Convert to seconds
    setIsInitialized(true);
  }, [durationString, isActive]);

  useEffect(() => {
    if (!isInitialized || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, onTimeUp]);

  // Don't render anything if no time limit or not active
  if (!isActive || getDurationInMinutes(durationString) === 0) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isLowTime = timeRemaining <= 300; // 5 minutes warning

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
      isLowTime ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
    }`}>
      {isLowTime ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">
        {minutes}:{seconds.toString().padStart(2, '0')} remaining
      </span>
    </div>
  );
};

export default SessionTimer;
