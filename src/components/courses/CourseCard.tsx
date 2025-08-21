
import React, { useState } from 'react';
import { Play, CheckCircle, Clock, TestTube, Users, Crown, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';

interface CourseCardProps {
  course: any;
  status: string;
  progress: any;
  user: any;
  onStartSession: (course: any) => void;
  onTestCourse?: (course: any) => void;
  onAssignCourse?: (course: any) => void;
  onEditCourse?: (course: any) => void;
  hoveredAssign?: string | null;
  onAssignHover?: (courseId: string | null) => void;
  showAdminActions?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  status,
  progress,
  user,
  onStartSession,
  onTestCourse,
  onAssignCourse,
  onEditCourse,
  hoveredAssign,
  onAssignHover,
  showAdminActions = true
}) => {
  const [showModules, setShowModules] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Play className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  const getButtonText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Review';
      case 'in-progress':
        return 'Continue';
      default:
        return 'Start';
    }
  };

  // Check if course has structured modules
  const hasModules = course.course_plan?.modules && Array.isArray(course.course_plan.modules) && course.course_plan.modules.length > 0;

  return (
    <div className="bg-white border rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2 truncate">{course.course_title}</h4>
          <p className="text-gray-600 text-xs sm:text-sm">{course.track_type}</p>
          {course.course_plan?.goal && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">Goal: {course.course_plan.goal}</p>
          )}
        </div>
        <div className="flex-shrink-0 ml-2">
          {getStatusIcon(status)}
        </div>
      </div>
      
      {progress && (
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span>Progress</span>
            <span className="font-medium">{progress.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress || 0}%` }}
            />
          </div>
          {progress.total_interactions > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {progress.total_interactions} interactions completed
            </div>
          )}
        </div>
      )}

      {/* Course Modules Preview */}
      {hasModules && (
        <div className="mb-3 sm:mb-4">
          <button
            onClick={() => setShowModules(!showModules)}
            className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 mb-2"
          >
            {showModules ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
            <span>{showModules ? 'Hide' : 'Show'} Course Structure ({course.course_plan.modules.length} modules)</span>
          </button>
          
          {showModules && (
            <div className="space-y-2 sm:space-y-3">
              {course.course_plan.modules.map((module: any, index: number) => (
                <div key={module.id || index} className="bg-gray-50 rounded-lg p-2 sm:p-3">
                  <div className="flex items-start justify-between mb-1 sm:mb-2">
                    <h5 className="font-medium text-xs sm:text-sm text-gray-800 truncate">{module.title}</h5>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{module.duration} min</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1 sm:mb-2 line-clamp-2">{module.content}</p>
                  {module.keyPoints && module.keyPoints.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Key Points:</span>
                      <ul className="mt-1 space-y-1">
                        {module.keyPoints.slice(0, 2).map((point: string, pointIndex: number) => (
                          <li key={pointIndex} className="flex items-start space-x-2 truncate">
                            <span className="text-gray-500 mt-0.5">➜</span>
                            <span className="truncate">{point}</span>
                          </li>
                        ))}
                        {module.keyPoints.length > 2 && (
                          <li className="text-gray-400">+{module.keyPoints.length - 2} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <span className="text-xs sm:text-sm text-gray-600">{getStatusText(status)}</span>
          <button
            onClick={() => onStartSession(course)}
            className={`flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm ${
              status === 'completed' 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : status === 'in-progress'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            <Play className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{getButtonText(status)}</span>
          </button>
        </div>
        
        {showAdminActions && user.role === 'Admin' && onTestCourse && onAssignCourse && (
          <div className="flex flex-wrap gap-1 sm:gap-2 pt-2">
            <button
              onClick={() => onTestCourse(course)}
              className="flex items-center space-x-1 px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs sm:text-sm hover:bg-blue-200"
            >
              <TestTube className="h-3 w-3" />
              <span>Test</span>
            </button>
            
            {onEditCourse && (
              <button
                onClick={() => onEditCourse(course)}
                className="flex items-center space-x-1 px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded text-xs sm:text-sm hover:bg-green-200"
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit</span>
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => onAssignCourse(course)}
                onMouseEnter={() => user.plan === 'Free' && onAssignHover && onAssignHover(course.id)}
                onMouseLeave={() => onAssignHover && onAssignHover(null)}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
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

export default CourseCard;
