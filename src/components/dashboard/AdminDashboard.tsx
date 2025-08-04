
import React from 'react';
import { BookOpen, Users, Clock } from 'lucide-react';
import MetricCard from './MetricCard';

interface AdminDashboardProps {
  courses: any[];
  performance: any[];
  onStartSession: (courseId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ courses, performance, onStartSession }) => {
  const publishedCourses = courses.filter((course: any) => course.status === 'published');
  const draftCourses = courses.filter((course: any) => course.status === 'drafted');

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          icon={BookOpen}
          iconColor="text-green-500"
          value={publishedCourses.length}
          label="Published Courses"
        />
        <MetricCard
          icon={Clock}
          iconColor="text-yellow-500"
          value={draftCourses.length}
          label="Draft Courses"
        />
        <MetricCard
          icon={Users}
          iconColor="text-blue-500"
          value={new Set(performance.map(p => p.user_id)).size}
          label="Active Learners"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-xl font-semibold mb-4">Your Courses</h3>
          {courses.length === 0 ? (
            <p className="text-gray-500">No courses created yet. Start by creating your first course!</p>
          ) : (
            <div className="space-y-3">
              {courses.slice(0, 5).map((course: any) => (
                <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{course.course_title}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <span>{course.track_type}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        course.status === 'published' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {course.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(course.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-xl font-semibold mb-4">Team Performance</h3>
          {performance.length === 0 ? (
            <p className="text-gray-500">No team activity yet. Assign courses to team members to see their progress.</p>
          ) : (
            <div className="space-y-3">
              {performance.slice(0, 5).map((perf: any) => {
                const profile = perf.profiles;
                
                return (
                  <div key={perf.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{profile?.full_name || 'Unknown User'}</div>
                      <div className="text-sm text-gray-500">
                        {perf.courses?.course_title} • {profile?.team || 'General'} Team
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">{perf.progress || 0}%</div>
                      <div className="text-sm text-gray-400">{perf.total_interactions || 0} interactions</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
