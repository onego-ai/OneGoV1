
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Turnstile } from '@/components/ui/Turnstile';

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const turnstileRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for auth errors in URL (from OAuth redirects)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    const token = urlParams.get('token');
    const type = urlParams.get('type');
    
    if (error) {
      console.error('Auth error:', error, errorDescription);
      toast({
        title: "Authentication Error",
        description: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : "An error occurred during authentication",
        variant: "destructive",
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Handle email confirmation
    if (token && type === 'signup') {
      handleEmailConfirmation(token);
    }
  }, []);

  const handleEmailConfirmation = async (token: string) => {
    try {
      setLoading(true);
      console.log('Confirming email with token...');
      
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) {
        console.error('Email confirmation error:', error);
        throw error;
      }

      if (data.session) {
        console.log('Email confirmed successfully');
        toast({
          title: "Email Confirmed!",
          description: "Your account has been activated successfully.",
        });
        onAuthSuccess();
      }
    } catch (error: any) {
      console.error('Email confirmation error:', error);
      toast({
        title: "Confirmation Error",
        description: error.message || "Failed to confirm email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTurnstileVerify = async (token: string) => {
    try {
      setTurnstileToken(token);
      setTurnstileVerified(true);
      
      // Verify token with our Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-turnstile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      
      if (!result.success) {
        setTurnstileVerified(false);
        setTurnstileToken('');
        toast({
          title: "Turnstile Error",
          description: "Please complete the Turnstile verification.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Turnstile verification error:', error);
      setTurnstileVerified(false);
      setTurnstileToken('');
      toast({
        title: "Verification Error",
        description: "Failed to verify Turnstile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTurnstileExpired = () => {
    setTurnstileVerified(false);
    setTurnstileToken('');
  };

  const handleTurnstileError = () => {
    setTurnstileVerified(false);
    setTurnstileToken('');
    toast({
      title: "Turnstile Error",
      description: "An error occurred with Turnstile. Please try again.",
      variant: "destructive",
    });
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      console.log('Starting Google OAuth...');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileVerified) {
      toast({
        title: "Verification Required",
        description: "Please complete the Turnstile verification.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Starting email signup with OTP...');
        
        const { data: authData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              company_name: companyName,
            }
          }
        });

        if (error) {
          console.error('Signup error:', error);
          throw error;
        }

        if (authData.user && !authData.session) {
          console.log('User created, email confirmation sent');
          setShowOTP(true);
          toast({
            title: "Check Your Email",
            description: "We've sent you a confirmation link. Please check your email and click the link to activate your account.",
          });
          setLoading(false);
          return;
        }

        if (authData.session) {
          console.log('User signed up and signed in successfully');
          onAuthSuccess();
          return;
        }
      } else {
        // Sign in
        console.log('Starting email signin...');
        
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          console.error('Signin error:', error);
          throw error;
        }

        if (authData.session) {
          console.log('User signed in successfully');
          onAuthSuccess();
          return;
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "An error occurred during authentication. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);

    try {
      console.log('Verifying OTP...');
      
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (error) {
        console.error('OTP verification error:', error);
        throw error;
      }

      console.log('OTP verification successful:', data);
      toast({
        title: "Account verified!",
        description: "Your account has been successfully created and verified.",
      });
      onAuthSuccess();
    } catch (error: any) {
      console.error('OTP verification error:', error);
      let errorMessage = error.message;
      
      if (error.message?.includes('Token has expired')) {
        errorMessage = 'Verification code has expired. Please request a new one.';
      } else if (error.message?.includes('Invalid token')) {
        errorMessage = 'Invalid verification code. Please check and try again.';
      }
      
      toast({
        title: "Verification Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast({
        title: "Code resent!",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showOTP) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <img 
              src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png" 
              alt="ONEGO Learning" 
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-600">
              We've sent a 6-digit verification code to<br />
              <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              type="submit"
              disabled={otpLoading || otp.length !== 6}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-semibold"
            >
              {otpLoading ? 'Verifying...' : 'Verify Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOTP}
              disabled={loading}
              className="text-green-500 hover:text-green-600 font-medium disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowOTP(false);
                setOtp('');
              }}
              className="text-gray-500 hover:text-gray-600 font-medium"
            >
              ← Back to signup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <img 
            src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png" 
            alt="ONEGO Learning" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ONEGO Learning</h1>
          <p className="text-gray-600">AI-Powered Training Platform</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verify you're human
            </label>
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAABkelv713e06-flZ'}
              onVerify={handleTurnstileVerify}
              onExpired={handleTurnstileExpired}
              onError={handleTurnstileError}
              className="flex justify-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-semibold"
          >
            {loading ? 'Loading...' : 
             isSignUp ? 'Start FREE Trial' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Loading...' : 'Continue with Google'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-green-500 hover:text-green-600 font-medium"
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Start FREE Trial"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
