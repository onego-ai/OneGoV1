
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileWithTeam {
  id: string;
  full_name: string;
  group_id: string;
  team?: string;
  [key: string]: any;
}

export const useDashboardData = (user: any) => {
  const [courses, setCourses] = useState([]);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      if (user.role === 'Admin') {
        // Fetch courses created by admin
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        setCourses(coursesData || []);

        // Fetch performance for team members in the same group
        const { data: performanceData } = await supabase
          .from('user_performance')
          .select(`
            *,
            profiles!user_performance_user_id_fkey (id, full_name, group_id, team),
            courses!user_performance_course_id_fkey (course_title, creator_id)
          `)
          .order('updated_at', { ascending: false })
          .limit(10);

        // Filter to show only performance for courses created by this admin and team members
        const filteredPerformance = performanceData?.filter(p => {
          const profile = p.profiles;
          
          // Type guard function to check if profile is valid
          const isValidProfile = (prof: any): prof is ProfileWithTeam => {
            return prof !== null && 
                   prof !== undefined && 
                   typeof prof === 'object' && 
                   'group_id' in prof &&
                   typeof prof.group_id === 'string';
          };
          
          // Use the type guard
          if (!isValidProfile(profile)) {
            return false;
          }
          
          // Now TypeScript knows profile is definitely valid
          return p.courses?.creator_id === user.id && 
                 profile.group_id === user.group_id;
        }) || [];

        setPerformance(filteredPerformance);
      } else {
        // Fetch individually assigned courses for standard user
        const { data: assignmentsData } = await supabase
          .from('individual_course_assignments')
          .select(`
            *,
            courses!individual_course_assignments_course_id_fkey (*)
          `)
          .eq('user_id', user.id)
          .order('assigned_at', { ascending: false });

        setAssignedCourses(assignmentsData?.map(a => a.courses).filter(Boolean) || []);

        // Fetch user's own performance
        const { data: performanceData } = await supabase
          .from('user_performance')
          .select(`
            *,
            courses!user_performance_course_id_fkey (course_title)
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        setPerformance(performanceData || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    courses,
    assignedCourses,
    performance,
    loading
  };
};
