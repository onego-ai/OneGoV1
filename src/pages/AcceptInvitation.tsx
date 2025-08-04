import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Users } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface InvitationData {
  id: string;
  inviter_email: string;
  invitee_email: string;
  role: string;
  status: string;
  expires_at: string;
  group_id: string;
  inviter_id: string;
  magic_link_token: string;
}

const AcceptInvitation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  // Form states for new user signup
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  
  // Login states for existing users
  const [loginPassword, setLoginPassword] = useState('');
  
  // Email verification states
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);

  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link - no token provided');
        setLoading(false);
        return;
      }

      try {
        console.log('Validating invitation with token:', token);
        
        // Check current user session
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user session:', user?.email || 'No user');
        setCurrentUser(user);

        // Validate invitation token with detailed logging
        console.log('Querying invitations table with token:', token);
        const { data: inviteData, error: inviteError } = await supabase
          .from('invitations')
          .select('*')
          .eq('magic_link_token', token)
          .eq('status', 'pending')
          .single();

        console.log('Invitation query result:', { inviteData, inviteError });

        if (inviteError || !inviteData) {
          console.error('Invitation validation failed:', inviteError);
          
          // Check if invitation exists but is already accepted
          const { data: existingInvite } = await supabase
            .from('invitations')
            .select('*')
            .eq('magic_link_token', token)
            .single();
          
          if (existingInvite && existingInvite.status === 'accepted') {
            setError('This invitation has already been accepted. You may already be part of the group.');
          } else {
            setError('This invitation is invalid or has already been used.');
          }
          setLoading(false);
          return;
        }

        // Check if invitation has expired
        if (new Date(inviteData.expires_at) < new Date()) {
          console.log('Invitation expired:', inviteData.expires_at);
          setError('This invitation has expired. Please request a new one.');
          setLoading(false);
          return;
        }

        console.log('Valid invitation found:', inviteData);
        setInvitation(inviteData);
        setLoading(false);

      } catch (error: any) {
        console.error('Error validating invitation:', error);
        setError('Failed to validate invitation. Please try again.');
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const markInvitationAsAccepted = async (invitationData: InvitationData) => {
    console.log('=== MARKING INVITATION AS ACCEPTED ===');
    console.log('Invitation data:', invitationData);
    
    try {
      // Enhanced approach with better error handling
      const { data: updateResult, error: updateError } = await supabase
        .from('invitations')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString() 
        })
        .eq('magic_link_token', invitationData.magic_link_token)
        .eq('status', 'pending') // Only update if still pending
        .select()
        .single();

      console.log('Update result:', { updateResult, updateError });

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
        // Continue anyway - the user joining the group is more important than the invitation status
      } else {
        console.log('Successfully updated invitation status');
      }

      return updateResult;
      
    } catch (error: any) {
      console.error('Error in markInvitationAsAccepted:', error);
      // Don't throw - let the process continue
      return null;
    }
  };

  // Profile creation with retry logic
  const waitForProfileCreation = async (userId: string, maxAttempts = 10, delay = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}: Checking for profile creation...`);
      
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profile && !profileError) {
          console.log('✅ Profile found:', profile);
          return profile;
        }
        
        if (attempt < maxAttempts) {
          console.log(`Profile not found yet, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 5000); // Exponential backoff, max 5s
        }
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error('Profile creation timeout - please try refreshing the page or contact support');
  };

  const ensureUserInGroup = async (userId: string, groupId: string, role: string) => {
    console.log('=== ENSURING USER IS IN GROUP ===');
    console.log('User ID:', userId, 'Group ID:', groupId, 'Role:', role);
    
    try {
      // Wait for profile to be created by the database trigger
      const currentProfile = await waitForProfileCreation(userId);
      
      if (currentProfile.group_id === groupId) {
        console.log('✅ User already in correct group');
        return true;
      }
      
      // Update the user's group
      console.log('🔄 Updating user group membership...');
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          group_id: groupId,
          role: role as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw new Error(`Failed to join group: ${updateError.message}`);
      }
      
      console.log('✅ Successfully updated profile:', updatedProfile);
      return true;
      
    } catch (error: any) {
      console.error('Error in ensureUserInGroup:', error);
      throw error;
    }
  };

  // OTP verification functions
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUserData) return;

    setOtpLoading(true);
    console.log('=== VERIFYING OTP ===');

    try {
      console.log('Verifying OTP for email:', invitation?.invitee_email);
      
      const { data, error } = await supabase.auth.verifyOtp({
        email: invitation!.invitee_email,
        token: otp,
        type: 'signup'
      });

      if (error) {
        console.error('OTP verification error:', error);
        throw error;
      }

      console.log('OTP verification successful:', data);
      
      // Now complete the group joining process
      console.log('=== COMPLETING GROUP JOIN AFTER EMAIL VERIFICATION ===');
      
      await ensureUserInGroup(pendingUserData.id, pendingUserData.group_id, pendingUserData.role);
      await markInvitationAsAccepted(pendingUserData.invitation);

      console.log('=== INVITATION ACCEPTANCE COMPLETED SUCCESSFULLY ===');

      toast({
        title: "Welcome to the team!",
        description: "Your account has been verified and you've joined the group successfully.",
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/?tab=dashboard');
      }, 1000);

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
    if (!invitation) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: invitation.invitee_email,
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
      setProcessing(false);
    }
  };

  const handleNewUserSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      console.log('Starting new user signup for invitation...');
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: invitation.invitee_email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (authData.user && !authData.session) {
        console.log('User created, OTP sent to email');
        setPendingUserData(authData.user);
        setShowOTP(true);
        setProcessing(false);
        return;
      }

      if (authData.session) {
        console.log('User signed up and signed in successfully');
        await handleJoinGroup();
        return;
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Error",
        description: error.message || "An error occurred during signup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleExistingUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      console.log('Starting existing user login for invitation...');
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: invitation.invitee_email,
        password: loginPassword
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      if (authData.session) {
        console.log('User logged in successfully');
        await handleJoinGroup();
        return;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: error.message || "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!invitation || !currentUser) return;
    
    setProcessing(true);
    console.log('=== STARTING JOIN GROUP FOR LOGGED-IN USER ===');

    try {
      // Step 1: Ensure user is in the correct group
      console.log('Step 1: Ensuring group membership...');
      await ensureUserInGroup(currentUser.id, invitation.group_id, invitation.role);

      // Step 2: Mark invitation as accepted
      console.log('Step 2: Marking invitation as accepted...');
      await markInvitationAsAccepted(invitation);

      console.log('=== JOIN GROUP PROCESS COMPLETED SUCCESSFULLY ===');

      toast({
        title: "Successfully joined!",
        description: "You've been added to the group and can now access shared resources.",
      });

      // Redirect to dashboard with a small delay
      setTimeout(() => {
        navigate('/?tab=dashboard');
      }, 1000);

    } catch (error: any) {
      console.error('=== JOIN GROUP PROCESS FAILED ===', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join the group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
          <div className="text-gray-600">Validating invitation...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Go to ONEGO Learning
          </button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  // Show OTP verification screen after signup
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
              <strong>{invitation.invitee_email}</strong>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              After verification, you'll automatically join the group.
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
              className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-semibold flex items-center justify-center"
            >
              {otpLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying & Joining Group...
                </>
              ) : (
                'Verify & Join Group'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOTP}
              disabled={processing}
              className="text-green-500 hover:text-green-600 font-medium disabled:opacity-50"
            >
              {processing ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowOTP(false);
                setOtp('');
                setPendingUserData(null);
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

  // If user is already logged in and it's the same email as the invitation
  if (currentUser && currentUser.email === invitation.invitee_email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <img 
              src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png" 
              alt="ONEGO Learning" 
              className="h-16 mx-auto mb-4"
            />
            <Users className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Group Invitation</h1>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-center">
              <strong>{invitation.inviter_email}</strong> has invited you to join their group as a <strong>{invitation.role}</strong>.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleJoinGroup}
              disabled={processing}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold flex items-center justify-center"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {processing ? 'Joining...' : 'Accept & Join Group'}
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full text-gray-600 hover:text-gray-800 py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show appropriate form based on whether user is logged in or if we need to show login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <img 
            src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png" 
            alt="ONEGO Learning" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              <strong>{invitation.inviter_email}</strong> has invited you to join their team as a <strong>{invitation.role}</strong>
            </p>
          </div>
        </div>

        {showLoginForm ? (
          // Show login form for existing users
          <form onSubmit={handleExistingUserLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={invitation.invitee_email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-semibold"
            >
              {processing ? 'Joining...' : 'Login & Join Group'}
            </button>

            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setShowLoginForm(false)}
                className="text-green-500 hover:text-green-600 font-medium"
              >
                Create one instead
              </button>
            </div>
          </form>
        ) : (
          // Show signup form for new users
          <form onSubmit={handleNewUserSignup} className="space-y-6">
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
                Email
              </label>
              <input
                type="email"
                value={invitation.invitee_email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create Password
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

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-semibold"
            >
              {processing ? 'Creating Account...' : 'Create Account & Join'}
            </button>

            <div className="text-center text-sm text-gray-600">
              Already have an account with this email?{' '}
              <button
                type="button"
                onClick={() => setShowLoginForm(true)}
                className="text-green-500 hover:text-green-600 font-medium"
              >
                Click here to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
