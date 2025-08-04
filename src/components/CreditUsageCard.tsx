import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Coins, Calendar, TrendingUp } from 'lucide-react';

interface CreditUsageCardProps {
  className?: string;
}

interface CreditSummary {
  plan_type: string;
  monthly_credits: number;
  credits_used_this_month: number;
  available_credits: number;
  total_credits: number;
  reset_date: string;
  additional_credits_purchased: number;
}

const CreditUsageCard: React.FC<CreditUsageCardProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCreditSummary();
    }
  }, [user?.id]);

  // Listen for credit consumption events
  useEffect(() => {
    const handleCreditConsumption = () => {
      loadCreditSummary();
    };

    // Listen for custom event when credits are consumed
    window.addEventListener('credits-consumed', handleCreditConsumption);
    
    return () => {
      window.removeEventListener('credits-consumed', handleCreditConsumption);
    };
  }, [user?.id]);

  const loadCreditSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading credit summary for user:', user!.id);

      const { data, error } = await (supabase as any)
        .rpc('get_user_credit_summary', {
          user_id_param: user!.id
        });

      if (error) {
        console.error('Error loading credit summary:', error);
        setError('Failed to load credit information');
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const summary = data[0] as CreditSummary;
        console.log('Credit summary loaded:', summary);
        setCreditSummary(summary);
      } else {
        console.log('No credit summary data returned');
        setCreditSummary(null);
      }
    } catch (err) {
      console.error('Error in loadCreditSummary:', err);
      setError('Failed to load credit information');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUsagePercentage = () => {
    if (!creditSummary) return 0;
    return Math.min((creditSummary.credits_used_this_month / creditSummary.total_credits) * 100, 100);
  };

  const getProgressBarColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-2 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Coins className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">{error}</p>
          <button
            onClick={loadCreditSummary}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!creditSummary) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Coins className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No credit information available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Coins className="h-8 w-8 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Credit Usage</h3>
            <p className="text-gray-600 text-sm">{creditSummary.plan_type} Plan</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {creditSummary.available_credits}
          </div>
          <div className="text-sm text-gray-500">credits available</div>
          <button
            onClick={loadCreditSummary}
            className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Usage Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Monthly Usage</span>
            <span className="font-medium text-gray-900">
              {creditSummary.credits_used_this_month} / {creditSummary.total_credits}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${getUsagePercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Credit Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-gray-600">Monthly Credits</div>
              <div className="font-medium text-gray-900">{creditSummary.monthly_credits}</div>
            </div>
          </div>
          
          {creditSummary.additional_credits_purchased > 0 && (
            <div className="flex items-center space-x-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-gray-600">Purchased</div>
                <div className="font-medium text-gray-900">+{creditSummary.additional_credits_purchased}</div>
              </div>
            </div>
          )}
        </div>

        {/* Reset Date */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 border-t pt-3">
          <Calendar className="h-4 w-4" />
          <span>Resets on {formatDate(creditSummary.reset_date)}</span>
        </div>
      </div>
    </div>
  );
};

export default CreditUsageCard; 