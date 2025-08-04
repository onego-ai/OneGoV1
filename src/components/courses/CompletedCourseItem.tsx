import React from 'react';
import { CheckCircle, TestTube, Users, Crown } from 'lucide-react';

interface CompletedCourseItemProps {
  course: any;
  progress: any;
  user: any;
  onTestCourse?: (course: any) => void;
  onAssignCourse?: (course: any) => void;
  hoveredAssign?: string | null;
  onAssignHover?: (courseId: string | null) => void;
  showAdminActions?: boolean;
}

const CompletedCourseItem: React.FC<CompletedCourseItemProps> = ({
  course,
  progress,
  user,
  onTestCourse,
  onAssignCourse,
  hoveredAssign,
  onAssignHover,
  showAdminActions = true
}) => {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center">
        <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
        <div>
          <h4 className="font-medium">{course.course_title}</h4>
          <p className="text-sm text-gray-600">{course.track_type}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-sm font-medium text-green-600">Completed</p>
          {progress && (
            <p className="text-sm text-gray-500">
              {progress.total_interactions || 0} interactions • {progress.points || 0} points
            </p>
          )}
        </div>
        
        {showAdminActions && user.role === 'Admin' && onTestCourse && onAssignCourse && (
          <div className="flex space-x-2">
            <button
              onClick={() => onTestCourse(course)}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
            >
              <TestTube className="h-3 w-3" />
              <span>Test</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => onAssignCourse(course)}
                onMouseEnter={() => user.plan === 'Free' && onAssignHover(course.id)}
                onMouseLeave={() => onAssignHover(null)}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${
                  user.plan === 'Free' 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                <Users className="h-3 w-3" />
                <span>Assign</span>
                {user.plan === 'Free' && <Crown className="h-3 w-3" />}
              </button>
              
              {hoveredAssign === course.id && user.plan === 'Free' && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                  Upgrade Account
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedCourseItem;
