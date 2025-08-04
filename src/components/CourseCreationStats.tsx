import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { BookOpen, Coins, TrendingUp } from 'lucide-react';

interface CourseCreationStatsProps {
  className?: string;
}

interface CourseCreationSummary {
  total_courses_created: number;
  credits_consumed: number;
  available_credits: number;
  plan_type: string;
}

const CourseCreationStats: React.FC<CourseCreationStatsProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CourseCreationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCourseCreationStats();
    }
  }, [user?.id]);

  const loadCourseCreationStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await (supabase as any)
        .rpc('get_course_creation_credits_summary', {
          user_id_param: user!.id
        });

      if (error) {
        console.error('Error loading course creation stats:', error);
        setError('Failed to load course creation statistics');
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        setSummary(data[0] as CourseCreationSummary);
      }
    } catch (err) {
      console.error('Error in loadCourseCreationStats:', err);
      setError('Failed to load course creation statistics');
    } finally {
      setLoading(false);
    }
  };

  // Listen for credit consumption events
  useEffect(() => {
    const handleCreditConsumption = () => {
      loadCourseCreationStats();
    };

    window.addEventListener('credits-consumed', handleCreditConsumption);
    
    return () => {
      window.removeEventListener('credits-consumed', handleCreditConsumption);
    };
  }, [user?.id]);

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
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">{error}</p>
          <button
            onClick={loadCourseCreationStats}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No course creation statistics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-8 w-8 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Course Creation Stats</h3>
            <p className="text-gray-600 text-sm">{summary.plan_type} Plan</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {summary.total_courses_created}
          </div>
          <div className="text-sm text-gray-500">courses created</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Credits Consumed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-gray-600">Credits Consumed</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {summary.credits_consumed}
          </span>
        </div>

        {/* Available Credits */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-600">Available Credits</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {summary.available_credits}
          </span>
        </div>

        {/* Usage Rate */}
        {summary.total_courses_created > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Usage Rate</span>
              <span className="font-medium text-gray-900">
                {Math.round((summary.credits_consumed / summary.total_courses_created) * 100)}% of courses used credits
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCreationStats; 