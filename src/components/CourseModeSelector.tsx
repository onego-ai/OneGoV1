import React from 'react';
import { MessageCircle, BookOpen, Play, ArrowLeft } from 'lucide-react';

interface CourseModeSelectorProps {
  course: any;
  onSelectMode: (mode: 'chat' | 'reading') => void;
  onBack: () => void;
}

const CourseModeSelector: React.FC<CourseModeSelectorProps> = ({ 
  course, 
  onSelectMode, 
  onBack 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Learning Style
          </h1>
          <p className="text-gray-600">
            Select how you'd like to experience "{course.course_title}"
          </p>
        </div>

        {/* Course Info Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Play className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {course.course_title}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {course.track_type} Track
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {course.course_plan?.duration || '30'} minutes
                </span>
              </div>
              <p className="text-gray-600 mt-2">
                {course.course_plan?.goal || course.course_plan?.objective || 'Enhance your skills and knowledge'}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Chat Mode */}
          <div 
            onClick={() => onSelectMode('chat')}
            className="bg-white rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-green-300 group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-lg mb-4 group-hover:bg-green-200 transition-colors">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Interactive Chat
            </h3>
            
            <p className="text-gray-600 mb-4">
              Engage in real-time conversations with your AI tutor. Ask questions, get instant feedback, and learn through dynamic interactions.
            </p>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Real-time voice & text conversations
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Personalized AI tutor guidance
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Interactive Q&A sessions
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Adaptive learning pace
              </div>
            </div>
            
            <div className="mt-6">
              <button className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 font-medium transition-colors">
                Start Interactive Session
              </button>
            </div>
          </div>

          {/* Reading Mode */}
          <div 
            onClick={() => onSelectMode('reading')}
            className="bg-white rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300 group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mb-4 group-hover:bg-blue-200 transition-colors">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Self-Paced Reading
            </h3>
            
            <p className="text-gray-600 mb-4">
              Read through structured course content at your own pace. Absorb information through well-organized sections with audio narration.
            </p>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Structured course sections
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Audio narration available
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Self-paced learning
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Key points & summaries
              </div>
            </div>
            
            <div className="mt-6">
              <button className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 font-medium transition-colors">
                Start Reading Session
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            You can switch between modes at any time during your session
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseModeSelector; 