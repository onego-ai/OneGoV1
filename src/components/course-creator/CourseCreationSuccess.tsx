
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
    <div className="p-8 max-w-3xl mx-auto text-center">
      <div className="bg-white rounded-lg p-8 shadow-sm border">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Play className="h-8 w-8 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Created Successfully!</h2>
        <p className="text-gray-600 mb-6">
          Your course "<strong>{course.course_title}</strong>" is ready for live interaction.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Course Details:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Track:</strong> {selectedTrack}</p>
            <p><strong>Tutor:</strong> {selectedTrack === 'Corporate' ? 'Nia' : 'Leo'}</p>
            <p><strong>Status:</strong> Live & Ready</p>
          </div>
        </div>

        <button
          onClick={() => onStartCourse()}
          className="inline-flex items-center space-x-2 px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-lg"
        >
          <Play className="h-5 w-5" />
          <span>Start Course</span>
        </button>
        
        <p className="text-sm text-gray-500 mt-4">
          Your AI tutor will begin the session once you click "Start Course"
        </p>
      </div>
    </div>
  );
};

export default CourseCreationSuccess;
