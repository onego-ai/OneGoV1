
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AssignedCoursesSection from './courses/AssignedCoursesSection';

interface CoursesViewProps {
  user: any;
  onStartSession: (course: any) => void;
}

const CoursesView: React.FC<CoursesViewProps> = ({ user, onStartSession }) => {
  const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredAssign, setHoveredAssign] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCourses();
    
    // Set up real-time subscription for performance updates
    const performanceChannel = supabase
      .channel('performance-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_performance',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Performance update received:', payload);
          loadCourses(); // Refresh the data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(performanceChannel);
    };
  }, [user]);

  const loadCourses = async () => {
    try {
      console.log('Loading courses for user:', user.id);
      
      // Load individually assigned courses - only show published courses
      const { data: assignedData, error: assignedError } = await supabase
        .from('individual_course_assignments')
        .select(`
          *,
          courses!individual_course_assignments_course_id_fkey (*)
        `)
        .eq('user_id', user.id)
        .eq('courses.status', 'published');

      if (assignedError) {
        console.error('Error loading assigned courses:', assignedError);
        throw assignedError;
      }

      console.log('Assigned courses data:', assignedData);
      const courses = assignedData?.map(a => a.courses).filter(course => course !== null) || [];
      setAssignedCourses(courses);

      // Load user performance
      const { data: performanceData, error: performanceError } = await supabase
        .from('user_performance')
        .select(`
          *,
          courses!user_performance_course_id_fkey (course_title)
        `)
        .eq('user_id', user.id);

      if (performanceError) {
        console.error('Error loading performance:', performanceError);
        throw performanceError;
      }

      console.log('Performance data:', performanceData);
      setPerformance(performanceData || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCourseProgress = (courseId: string) => {
    return performance.find(p => p.course_id === courseId);
  };

  const getCourseStatus = (courseId: string) => {
    const progress = getCourseProgress(courseId);
    
    // No performance record means not started
    if (!progress) {
      console.log(`Course ${courseId}: No performance record - not-started`);
      return 'not-started';
    }
    
    // Check if completed (progress = 100 AND completed_at is set)
    if (progress.progress >= 100 && progress.completed_at) {
      console.log(`Course ${courseId}: Progress ${progress.progress}% with completion date - completed`);
      return 'completed';
    }
    
    // Check if in progress (progress > 0 but not completed)
    if (progress.progress > 0) {
      console.log(`Course ${courseId}: Progress ${progress.progress}% - in-progress`);
      return 'in-progress';
    }
    
    // Default to not started
    console.log(`Course ${courseId}: Progress 0% - not-started`);
    return 'not-started';
  };

  const handleStartSession = (course: any) => {
    // Store session data to help with resuming
    const sessionKey = `session_${course.id}`;
    const existingSession = localStorage.getItem(sessionKey);
    
    if (existingSession) {
      console.log('Resuming existing session for course:', course.id);
    } else {
      console.log('Starting new session for course:', course.id);
    }
    
    onStartSession(course);
  };

  const handleTestCourse = (course: any) => {
    // Clear any existing session data to start fresh
    localStorage.removeItem(`session_${course.id}`);
    onStartSession(course);
  };

  const handleAssignCourse = (course: any) => {
    if (user.plan === 'Free') {
      toast({
        title: "Upgrade Required",
        description: "Please upgrade to Pro to assign courses to team members.",
        variant: "destructive",
      });
      return;
    }
    
    // TODO: Implement assignment functionality
    toast({
      title: "Coming Soon",
      description: "Course assignment feature will be available soon!",
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading courses...</div>
      </div>
    );
  }

  // Categorize courses by progress status
  const notStartedCourses = assignedCourses.filter(course => {
    const status = getCourseStatus(course.id);
    return status === 'not-started';
  });
  
  const inProgressCourses = assignedCourses.filter(course => {
    const status = getCourseStatus(course.id);
    return status === 'in-progress';
  });
  
  const completedCourses = assignedCourses.filter(course => {
    const status = getCourseStatus(course.id);
    return status === 'completed';
  });

  console.log('Course categorization:', {
    total: assignedCourses.length,
    notStarted: notStartedCourses.length,
    inProgress: inProgressCourses.length,
    completed: completedCourses.length
  });

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">My Courses</h2>
      
      {assignedCourses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No courses assigned yet.</div>
          <div className="text-sm text-gray-400">Your administrator will assign courses to you.</div>
        </div>
      ) : (
        <div className="space-y-6">
          <AssignedCoursesSection
            title="Not Started"
            courses={notStartedCourses}
            color="red"
            user={user}
            onStartSession={handleStartSession}
            onTestCourse={handleTestCourse}
            onAssignCourse={handleAssignCourse}
            hoveredAssign={hoveredAssign}
            onAssignHover={setHoveredAssign}
            getCourseProgress={getCourseProgress}
            getCourseStatus={getCourseStatus}
            showAdminActions={false}
          />
          
          <AssignedCoursesSection
            title="In Progress"
            courses={inProgressCourses}
            color="orange"
            user={user}
            onStartSession={handleStartSession}
            onTestCourse={handleTestCourse}
            onAssignCourse={handleAssignCourse}
            hoveredAssign={hoveredAssign}
            onAssignHover={setHoveredAssign}
            getCourseProgress={getCourseProgress}
            getCourseStatus={getCourseStatus}
            showAdminActions={false}
          />
          
          <AssignedCoursesSection
            title="Completed"
            courses={completedCourses}
            color="green"
            user={user}
            onStartSession={handleStartSession}
            onTestCourse={handleTestCourse}
            onAssignCourse={handleAssignCourse}
            hoveredAssign={hoveredAssign}
            onAssignHover={setHoveredAssign}
            getCourseProgress={getCourseProgress}
            getCourseStatus={getCourseStatus}
            showAdminActions={false}
          />
        </div>
      )}
    </div>
  );
};

export default CoursesView;
