
import React from 'react';
import { Play } from 'lucide-react';

interface CourseCreationSuccessProps {
  course: any;
  selectedTrack: 'Corporate' | 'Educational';
  onStartCourse: (mode?: 'chat' | 'reading') => void;
}

const CourseCreationSuccess: React.FC<CourseCreationSuccessProps> = ({
  course,
  selectedTrack,
  onStartCourse
}) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto text-center">
      <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 shadow-sm border">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <Play className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Course Created Successfully!</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Your course "<strong>{course.course_title}</strong>" is ready for live interaction.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Course Details:</h3>
          <div className="text-xs sm:text-sm text-gray-600 space-y-1">
            <p><strong>Track:</strong> {selectedTrack}</p>
            <p><strong>Tutor:</strong> {selectedTrack === 'Corporate' ? 'Nia' : 'Leo'}</p>
            <p><strong>Status:</strong> Live & Ready</p>
          </div>
        </div>

        <button
          onClick={() => onStartCourse()}
          className="inline-flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 sm:py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-base sm:text-lg touch-target w-full sm:w-auto"
        >
          <Play className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Start Course</span>
        </button>
        
        <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
          Your AI tutor will begin the session once you click "Start Course"
        </p>
      </div>
    </div>
  );
};

export default CourseCreationSuccess;
