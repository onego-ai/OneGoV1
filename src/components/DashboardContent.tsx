
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Play, Award, Clock, Users } from 'lucide-react';
import CreditUsageCard from './CreditUsageCard';
import CourseCreationStats from './CourseCreationStats';

interface DashboardContentProps {
  user: any;
  onStartSession: (course: any) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ user, onStartSession }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      if (user.role === 'Admin') {
        // Load created courses for admins
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        if (coursesError) throw coursesError;
        setCourses(coursesData || []);

        // Load all performance data for admin overview
        const { data: performanceData, error: performanceError } = await supabase
          .from('user_performance')
          .select(`
            *,
            courses (course_title),
            profiles (full_name)
          `)
          .order('updated_at', { ascending: false });

        if (performanceError) throw performanceError;
        setPerformance(performanceData || []);
      } else {
        // Load assigned courses for standard users
        const { data: assignedData, error: assignedError } = await supabase
          .from('course_assignments')
          .select(`
            *,
            courses (*)
          `)
          .eq('group_id', user.group_id);

        if (assignedError) throw assignedError;
        setAssignedCourses(assignedData?.map(a => a.courses) || []);

        // Load user's performance
        const { data: performanceData, error: performanceError } = await supabase
          .from('user_performance')
          .select(`
            *,
            courses (course_title)
          `)
          .eq('user_id', user.id);

        if (performanceError) throw performanceError;
        setPerformance(performanceData || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderAdminDashboard = () => (
    <div className="space-y-8">
      {/* Credit Usage Card */}
      <CreditUsageCard />
      
      {/* Course Creation Stats */}
      <CourseCreationStats />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold">{courses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Active Learners</p>
              <p className="text-2xl font-bold">{performance.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Avg. Progress</p>
              <p className="text-2xl font-bold">
                {performance.length > 0 
                  ? Math.round(performance.reduce((sum, p) => sum + (p.progress || 0), 0) / performance.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Your Courses</h3>
        {courses.length === 0 ? (
          <p className="text-gray-500">No courses created yet. Use the Course Creator to get started!</p>
        ) : (
          <div className="space-y-4">
            {courses.map(course => (
              <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{course.course_title}</h4>
                  <p className="text-sm text-gray-600">{course.track_type}</p>
                </div>
                <button
                  onClick={() => onStartSession(course)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Play className="h-4 w-4" />
                  <span>Test Course</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {performance.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {performance.slice(0, 5).map(perf => (
              <div key={perf.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium">{perf.profiles?.full_name}</p>
                  <p className="text-sm text-gray-600">{perf.courses?.course_title}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{perf.progress || 0}%</p>
                  <p className="text-sm text-gray-600">{perf.total_interactions || 0} interactions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStandardDashboard = () => (
    <div className="space-y-8">
      {/* Credit Usage Card */}
      <CreditUsageCard />
      
      {/* Course Creation Stats */}
      <CourseCreationStats />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Assigned Courses</p>
              <p className="text-2xl font-bold">{assignedCourses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold">
                {performance.filter(p => p.progress > 0 && p.progress < 100).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold">
                {performance.filter(p => p.progress === 100).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Available Courses</h3>
        {assignedCourses.length === 0 ? (
          <p className="text-gray-500">No courses assigned yet. Contact your administrator.</p>
        ) : (
          <div className="space-y-4">
            {assignedCourses.map(course => {
              const userProgress = performance.find(p => p.course_id === course.id);
              return (
                <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{course.course_title}</h4>
                    <p className="text-sm text-gray-600">{course.track_type}</p>
                    {userProgress && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{userProgress.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${userProgress.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onStartSession(course)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 ml-4"
                  >
                    <Play className="h-4 w-4" />
                    <span>{userProgress?.progress > 0 ? 'Continue' : 'Start'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-600 mt-2">
          {user.role === 'Admin' 
            ? 'Manage your courses and track team progress' 
            : 'Continue your learning journey'}
        </p>
      </div>

      {user.role === 'Admin' ? renderAdminDashboard() : renderStandardDashboard()}
    </div>
  );
};

export default DashboardContent;
