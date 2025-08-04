
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Users, ArrowRight } from 'lucide-react';

const Success: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/');
          return;
        }

        // Check subscription status
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (subscriber) {
          setSubscriptionData(subscriber);
          toast({
            title: "Payment Successful!",
            description: "Your Pro subscription is now active.",
          });
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        toast({
          title: "Error",
          description: "Failed to verify subscription status.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [navigate, toast]);

  const handleInviteTeam = () => {
    // Navigate to the main app with people tab active
    navigate('/?tab=people');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Verifying your subscription...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to ONEGO Pro!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your subscription has been activated successfully. You now have access to all Pro features.
        </p>

        {subscriptionData && (
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-green-800">
              <p><strong>Plan:</strong> {subscriptionData.subscription_tier}</p>
              <p><strong>Licenses:</strong> {subscriptionData.licenses_purchased} total</p>
              {subscriptionData.subscription_end && (
                <p><strong>Next billing:</strong> {new Date(subscriptionData.subscription_end).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleInviteTeam}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
          >
            <Users className="h-4 w-4" />
            <span>Invite Team Members</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Success;
