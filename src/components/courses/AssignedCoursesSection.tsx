
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import CourseCard from './CourseCard';
import CompletedCourseItem from './CompletedCourseItem';

interface AssignedCoursesSectionProps {
  title: string;
  courses: any[];
  color: 'red' | 'orange' | 'green';
  user: any;
  onStartSession: (course: any) => void;
  onTestCourse?: (course: any) => void;
  onAssignCourse?: (course: any) => void;
  hoveredAssign?: string | null;
  onAssignHover?: (courseId: string | null) => void;
  getCourseProgress: (courseId: string) => any;
  getCourseStatus: (courseId: string) => string;
  showAdminActions?: boolean;
}

const AssignedCoursesSection: React.FC<AssignedCoursesSectionProps> = ({
  title,
  courses,
  color,
  user,
  onStartSession,
  onTestCourse,
  onAssignCourse,
  hoveredAssign,
  onAssignHover,
  getCourseProgress,
  getCourseStatus,
  showAdminActions = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getHeaderColorClass = () => {
    switch (color) {
      case 'red':
        return 'bg-red-500 text-white';
      case 'orange':
        return 'bg-orange-500 text-white';
      case 'green':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getBorderColorClass = () => {
    switch (color) {
      case 'red':
        return 'border-red-200';
      case 'orange':
        return 'border-orange-200';
      case 'green':
        return 'border-green-200';
      default:
        return 'border-gray-200';
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden mb-4 ${getBorderColorClass()}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex items-center justify-between ${getHeaderColorClass()} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center space-x-2">
          <span className="font-semibold">{title}</span>
          <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-sm">
            {courses.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5" />
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
      </button>

      {isExpanded && (
        <div className="bg-white">
          {courses.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No courses in this category yet.
            </div>
          ) : color === 'green' ? (
            // Completed courses use the compact list view
            <div className="divide-y divide-gray-200">
              {courses.map((course) => {
                const progress = getCourseProgress(course.id);
                return (
                  <CompletedCourseItem
                    key={course.id}
                    course={course}
                    progress={progress}
                    user={user}
                    onTestCourse={onTestCourse}
                    onAssignCourse={onAssignCourse}
                    hoveredAssign={hoveredAssign}
                    onAssignHover={onAssignHover}
                    showAdminActions={showAdminActions}
                  />
                );
              })}
            </div>
          ) : (
            // Not started and in progress courses use the card view
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const status = getCourseStatus(course.id);
                  const progress = getCourseProgress(course.id);
                  
                  return (
                    <CourseCard
                      key={course.id}
                      course={course}
                      status={status}
                      progress={progress}
                      user={user}
                      onStartSession={onStartSession}
                      onTestCourse={onTestCourse}
                      onAssignCourse={onAssignCourse}
                      hoveredAssign={hoveredAssign}
                      onAssignHover={onAssignHover}
                      showAdminActions={showAdminActions}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignedCoursesSection;
