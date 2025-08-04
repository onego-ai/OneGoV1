// Fix for Email Confirmation Authentication
// This shows how to handle email confirmation links properly

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for email confirmation in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const type = urlParams.get('type');
    
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Starting email signup...');
        
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
          setShowEmailConfirmation(true);
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

  // Rest of the component remains the same...
};

export default Auth; 