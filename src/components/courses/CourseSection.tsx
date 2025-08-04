
import React from 'react';
import CourseCard from './CourseCard';
import CompletedCourseItem from './CompletedCourseItem';
import EmptyState from './EmptyState';

interface CourseSectionProps {
  title: string;
  courses: any[];
  type: 'active' | 'completed';
  user: any;
  performance: any[];
  onStartSession: (course: any) => void;
  onTestCourse: (course: any) => void;
  onAssignCourse: (course: any) => void;
  hoveredAssign: string | null;
  onAssignHover: (courseId: string | null) => void;
  getCourseProgress: (courseId: string) => any;
  getCourseStatus: (courseId: string) => string;
}

const CourseSection: React.FC<CourseSectionProps> = ({
  title,
  courses,
  type,
  user,
  performance,
  onStartSession,
  onTestCourse,
  onAssignCourse,
  hoveredAssign,
  onAssignHover,
  getCourseProgress,
  getCourseStatus
}) => {
  if (type === 'active') {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No active courses assigned."
            description="Contact your administrator to get started."
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="bg-white border rounded-lg">
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
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CourseSection;
