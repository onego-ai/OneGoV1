import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  HeadphonesIcon,
  Check,
  Mail,
  Loader2,
  Shield,
  Crown,
  Zap,
  Phone,
  Settings,
  Code,
  Database
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

const PricingPage: React.FC = () => {
  const [pricingOptions, setPricingOptions] = useState({
    billing: 'monthly',
  });
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const sendSupportEmail = () => {
    const subject = 'Support Request - ONEGO.ai';
    const body = 'Hi, I need help with...';
    window.location.href = `mailto:hello@onego.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const sendEnterpriseEmail = () => {
    const subject = 'Enterprise Plan Enquiry - ONEGO.ai';
    const body = 'Hi, I would like to learn more about the Enterprise plan...';
    window.location.href = `mailto:hello@onego.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleUpgradeToPlan = async (plan: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to upgrade your plan.",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: plan,
          billing: pricingOptions.billing
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Checkout Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch current plan
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            setCurrentPlan(data.plan);
          }
        } catch (err) {
          console.error('Error fetching current plan:', err);
        }
      }
    };

    fetchCurrentPlan();
  }, [user]);

  const getPlanPrice = (plan: string) => {
    const prices = {
      standard: { monthly: 149, yearly: 119 },
      pro: { monthly: 299, yearly: 239 },
      business: { monthly: 699, yearly: 559 }
    };
    
    const basePrice = prices[plan as keyof typeof prices]?.[pricingOptions.billing as keyof typeof prices.standard];
    return basePrice || 0;
  };

  const getButtonText = (planName: string) => {
    if (!currentPlan) return 'Get Started';
    
    const planMap: { [key: string]: string } = {
      'Free': 'free',
      'Standard': 'standard',
      'Pro': 'pro',
      'Business': 'business',
      'Enterprise': 'enterprise'
    };
    
    const currentPlanKey = planMap[currentPlan];
    const targetPlanKey = planName.toLowerCase();
    
    if (currentPlanKey === targetPlanKey) {
      return 'Current Plan';
    } else if (currentPlan === 'Free' && targetPlanKey === 'free') {
      return 'Current Plan';
    } else if (currentPlan === 'Free') {
      return 'Get Started';
    } else {
      return 'Upgrade';
    }
  };

  const isCurrentPlan = (planName: string) => {
    if (!currentPlan) return false;
    
    const planMap: { [key: string]: string } = {
      'Free': 'free',
      'Standard': 'standard',
      'Pro': 'pro',
      'Business': 'business',
      'Enterprise': 'enterprise'
    };
    
    const currentPlanKey = planMap[currentPlan];
    const targetPlanKey = planName.toLowerCase();
    
    return currentPlanKey === targetPlanKey || (currentPlan === 'Free' && targetPlanKey === 'free');
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Predictable pricing, scalable plans</h1>
          <p className="text-xl text-gray-600">Designed for every stage of your learning journey at ONEGO.ai</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 flex shadow-sm border">
            <button
              onClick={() => setPricingOptions(prev => ({ ...prev, billing: 'monthly' }))}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                pricingOptions.billing === 'monthly'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPricingOptions(prev => ({ ...prev, billing: 'yearly' }))}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                pricingOptions.billing === 'yearly'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
            </button>
          </div>
          {pricingOptions.billing === 'yearly' && (
            <div className="ml-4">
              <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Save 20% with Annual Plans
              </span>
            </div>
          )}
        </div>

        {/* How Credits Work */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-8 max-w-2xl mx-auto shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">How Credits Work</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">1 Credit = 1 AI Course Creation</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">1 Credit = 1 Course Session</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">Credits Reset Monthly</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-3">*1 Credit = 1000 Words Generated</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Free Plan */}
          <div className="bg-white rounded-lg border-2 border-yellow-400 p-6 relative">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <p className="text-gray-600 mb-4">Perfect for trying out ONEGO</p>
              <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
              <p className="text-gray-600 mb-4">Forever free</p>
              <button 
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCurrentPlan('Free') 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
                }`}
                disabled={isCurrentPlan('Free')}
              >
                {getButtonText('Free')}
              </button>
              <p className="text-xs text-gray-500 mt-2">Risk-Free, No Credit Card Required.</p>
            </div>
            
            <div className="bg-gray-100 rounded-lg p-3 mb-6">
              <p className="text-sm font-medium text-gray-900">50 Credits per month</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Up to 5 users</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">3 Courses Max</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">AI Course Builder</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">People Management</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">HonestBox</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Basic Analytics</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Email Support</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">ONEGO Branding</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Data Privacy & Security</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">1 Admin Account</span>
              </li>
            </ul>
          </div>

          {/* Standard Plan */}
          <div className="bg-white rounded-lg border-2 border-gray-300 p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Standard</h3>
              <p className="text-gray-600 mb-4">Great for small businesses</p>
              <div className="text-4xl font-bold text-gray-900 mb-2">${getPlanPrice('standard')}</div>
              <p className="text-gray-600 mb-4">per month</p>
              <button 
                onClick={() => handleUpgradeToPlan('standard')}
                disabled={loading || isCurrentPlan('Standard')}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCurrentPlan('Standard')
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : getButtonText('Standard')}
              </button>
            </div>
            
            <div className="bg-gray-100 rounded-lg p-3 mb-6">
              <p className="text-sm font-medium text-gray-900">500 Credits per month + $0.20/extra credit</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Up to 25 users</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">20 Courses Max</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">AI Course Builder</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">People Management</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">HonestBox</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Advanced Analytics</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Priority Support</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Custom Branding</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Data Privacy & Security</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">2 Admin Accounts</span>
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-lg border-2 border-green-500 p-6 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <p className="text-gray-600 mb-4">Perfect for growing companies</p>
              <div className="text-4xl font-bold text-gray-900 mb-2">${getPlanPrice('pro')}</div>
              <p className="text-gray-600 mb-4">per month</p>
              <button 
                onClick={() => handleUpgradeToPlan('pro')}
                disabled={loading || isCurrentPlan('Pro')}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCurrentPlan('Pro')
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : getButtonText('Pro')}
              </button>
            </div>
            
            <div className="bg-gray-100 rounded-lg p-3 mb-6">
              <p className="text-sm font-medium text-gray-900">1,500 Credits per month + $0.20/extra credit</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Up to 50 users</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">40 Courses Max</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Everything in Standard</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Performance Tracking</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">5 Admin Accounts</span>
              </li>
            </ul>
          </div>

          {/* Business Plan */}
          <div className="bg-white rounded-lg border-2 border-orange-400 p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
              <p className="text-gray-600 mb-4">Ideal for larger organizations</p>
              <div className="text-4xl font-bold text-gray-900 mb-2">${getPlanPrice('business')}</div>
              <p className="text-gray-600 mb-4">per month</p>
              <button 
                onClick={() => handleUpgradeToPlan('business')}
                disabled={loading || isCurrentPlan('Business')}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCurrentPlan('Business')
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : getButtonText('Business')}
              </button>
            </div>
            
            <div className="bg-gray-100 rounded-lg p-3 mb-6">
              <p className="text-sm font-medium text-gray-900">4,000 Credits per month + $0.20/extra credit</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Up to 250 users</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Unlimited Courses</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Everything in Pro</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Enterprise Security</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Dedicated Support</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">10 Admin Accounts</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Enterprise Plan */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg border-2 border-purple-500 p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-4">For large-scale deployments</p>
              <div className="mb-6">
                <p className="text-gray-900 text-lg font-medium mb-2">Let's Talk</p>
                <p className="text-gray-600 text-sm">Contact us for custom pricing</p>
              </div>
              <button 
                onClick={sendEnterpriseEmail}
                className="w-full py-3 px-4 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
              >
                Contact Sales
              </button>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Everything in Business +</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Higher Limits</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Priority Support</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">SLAs</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Success Manager (CSM)</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">White Labeling</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Custom Development</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Integrations</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">API Access</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">Custom Integrations</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Flexible Credit System */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-8 mb-8 max-w-4xl mx-auto shadow-sm">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-green-600 mb-4">Flexible Credit System</h3>
            <p className="text-gray-700 text-lg">Need more credits? Purchase additional credits anytime to scale your usage</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">$0.20</div>
              <p className="text-gray-600 text-sm">per additional credit</p>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-semibold text-green-600 mb-2">Volume Discounts</div>
              <p className="text-gray-600 text-sm">available for Enterprise</p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">All pricing is in USD</p>
          <p className="text-sm text-gray-400">
            Need help choosing? <button onClick={sendSupportEmail} className="text-green-500 hover:text-green-600 underline">Contact our team</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
