import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface CreditSummary {
  plan_type: string;
  monthly_credits: number;
  credits_used_this_month: number;
  available_credits: number;
  total_credits: number;
  reset_date: string;
  additional_credits_purchased: number;
}

export const useCreditInfo = () => {
  const { user } = useAuth();
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCreditSummary = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await (supabase as any)
        .rpc('get_user_credit_summary', {
          user_id_param: user.id
        });

      if (error) {
        console.error('Error loading credit summary:', error);
        setError('Failed to load credit information');
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        setCreditSummary(data[0] as CreditSummary);
      }
    } catch (err) {
      console.error('Error in loadCreditSummary:', err);
      setError('Failed to load credit information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditSummary();
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

  const creditInfo = creditSummary ? {
    availableCredits: creditSummary.available_credits,
    totalCredits: creditSummary.total_credits,
    planType: creditSummary.plan_type
  } : null;

  return {
    creditInfo,
    loading,
    error,
    refetch: loadCreditSummary
  };
}; 