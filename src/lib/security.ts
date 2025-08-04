import { supabase } from '@/integrations/supabase/client';

// Rate limiting implementation using Supabase for persistence
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async isAllowed(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Clean old entries and count current requests
      const { data: rateLimitData } = await supabase
        .from('active_sessions')
        .select('session_token, last_activity')
        .eq('session_token', key)
        .gte('last_activity', new Date(windowStart).toISOString())
        .order('last_activity', { ascending: false });

      const currentRequests = rateLimitData?.length || 0;

      if (currentRequests >= this.config.maxRequests) {
        const resetTime = windowStart + this.config.windowMs;
        return {
          allowed: false,
          remaining: 0,
          resetTime
        };
      }

      // Record this request
      await supabase
        .from('active_sessions')
        .insert({
          session_token: key,
          last_activity: new Date(now).toISOString(),
          user_id: null // Rate limiting entries don't need user_id
        });

      return {
        allowed: true,
        remaining: this.config.maxRequests - currentRequests - 1,
        resetTime: now + this.config.windowMs
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting service fails
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }
  }

  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.windowMs * 2).toISOString();
    try {
      await supabase
        .from('active_sessions')
        .delete()
        .lt('last_activity', cutoff)
        .is('user_id', null); // Only clean rate limiting entries
    } catch (error) {
      console.error('Rate limiter cleanup error:', error);
    }
  }
}

// Pre-configured rate limiters
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'api'
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: 'auth'
});

export const tutorRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'tutor'
});

// Security headers for client-side requests
export const getSecurityHeaders = (): Record<string, string> => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});

// CSRF Protection
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, expectedToken: string): boolean => {
  if (!token || !expectedToken || token.length !== expectedToken.length) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return result === 0;
};

// IP validation and sanitization
export const sanitizeIP = (ip: string): string => {
  // Remove any non-IP characters
  const cleaned = ip.replace(/[^0-9a-fA-F:.]/g, '');
  
  // Basic IPv4/IPv6 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (ipv4Regex.test(cleaned) || ipv6Regex.test(cleaned)) {
    return cleaned;
  }
  
  return 'unknown';
};

// Content Security Policy
export const getCSPHeader = (): string => {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://pgcgicxtcxeubuoqusic.supabase.co wss://pgcgicxtcxeubuoqusic.supabase.co",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
};

// Audit logging for security events
export const logSecurityEvent = async (event: {
  type: 'auth_attempt' | 'rate_limit_exceeded' | 'invalid_input' | 'sql_injection_attempt' | 'xss_attempt';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}): Promise<void> => {
  try {
    const sanitizedEvent = {
      ...event,
      ip: event.ip ? sanitizeIP(event.ip) : undefined,
      userAgent: event.userAgent?.substring(0, 200), // Limit user agent length
      details: event.details?.substring(0, 500), // Limit details length
      timestamp: new Date().toISOString()
    };

    // Log to Supabase for persistence (you could create a security_logs table)
    console.warn(`[SECURITY EVENT] ${event.type}:`, sanitizedEvent);
    
    // For critical events, you might want to send alerts
    if (event.severity === 'critical') {
      console.error(`[CRITICAL SECURITY EVENT] ${event.type}:`, sanitizedEvent);
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Session security validation
export const validateSession = async (sessionToken: string): Promise<boolean> => {
  if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.length < 10) {
    return false;
  }

  try {
    const { data: session } = await supabase.auth.getSession();
    return !!session?.session?.access_token;
  } catch (error) {
    await logSecurityEvent({
      type: 'auth_attempt',
      details: 'Invalid session validation attempt',
      severity: 'medium'
    });
    return false;
  }
};

// Input sanitization middleware
export const securityMiddleware = {
  async validateAndSanitize<T>(
    data: unknown,
    validator: (data: unknown) => { success: true; data: T } | { success: false; error: string }
  ): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
      // First pass validation
      const validationResult = validator(data);
      if (!validationResult.success) {
        await logSecurityEvent({
          type: 'invalid_input',
          details: `Validation failed: ${(validationResult as { success: false; error: string }).error}`,
          severity: 'low'
        });
        return { success: false, error: (validationResult as { success: false; error: string }).error };
      }

      return { success: true, data: (validationResult as { success: true; data: T }).data };
    } catch (error) {
      await logSecurityEvent({
        type: 'invalid_input',
        details: `Security middleware error: ${error}`,
        severity: 'high'
      });
      return { success: false, error: 'Security validation failed' };
    }
  },

  async checkRateLimit(identifier: string, limiter: RateLimiter): Promise<{ allowed: boolean; message?: string }> {
    const result = await limiter.isAllowed(identifier);
    
    if (!result.allowed) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        details: `Rate limit exceeded for ${identifier}`,
        severity: 'medium'
      });
      return {
        allowed: false,
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`
      };
    }

    return { allowed: true };
  }
};

// Periodic cleanup task
export const startSecurityCleanup = (): void => {
  // Clean up rate limiting data every 5 minutes
  const cleanupInterval = 5 * 60 * 1000;
  
  setInterval(async () => {
    try {
      await apiRateLimiter.cleanup();
      await authRateLimiter.cleanup();
      await tutorRateLimiter.cleanup();
    } catch (error) {
      console.error('Security cleanup error:', error);
    }
  }, cleanupInterval);
};