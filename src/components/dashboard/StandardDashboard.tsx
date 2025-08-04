
import React from 'react';

interface StandardDashboardProps {
  assignedCourses: any[];
  performance: any[];
  onStartSession: (courseId: string) => void;
}

const StandardDashboard: React.FC<StandardDashboardProps> = ({ assignedCourses, performance }) => {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">My Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-xl font-semibold mb-4">Assigned Courses</h3>
          {assignedCourses.length === 0 ? (
            <p className="text-gray-500">No courses assigned yet. Your administrator will assign courses to you.</p>
          ) : (
            <div className="space-y-3">
              {assignedCourses.map((course: any) => (
                <div key={course.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">{course.course_title}</div>
                  <div className="text-sm text-gray-500">{course.track_type}</div>
                  <div className="text-xs text-blue-600 mt-2">
                    View in "My Courses" to start learning
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-xl font-semibold mb-4">My Progress</h3>
          {performance.length === 0 ? (
            <p className="text-gray-500">No progress yet. Start a course to see your progress!</p>
          ) : (
            <div className="space-y-3">
              {performance.map((perf: any) => (
                <div key={perf.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{perf.courses?.course_title}</div>
                    <div className="text-green-600 font-semibold">{perf.progress || 0}%</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${perf.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>{perf.total_interactions || 0} interactions</span>
                    <span>{perf.points || 0} points</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StandardDashboard;
