
import React from 'react';
import { Building2, GraduationCap, ArrowRight, Coins } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import CorporateStepRenderer from './CorporateStepRenderer';
import EducationalStepRenderer from './EducationalStepRenderer';

interface CourseCreatorStepsProps {
  selectedTrack: 'Corporate' | 'Educational';
  currentStep: number;
  formData: any;
  setFormData: (data: any) => void;
  setCurrentStep: (step: number) => void;
  onBack: () => void;
  onCreateCourse: () => void;
  loading: boolean;
  userId: string;
  userPlan?: string;
  creditInfo?: {
    availableCredits: number;
    totalCredits: number;
    planType: string;
  };
}

const CourseCreatorSteps: React.FC<CourseCreatorStepsProps> = ({
  selectedTrack,
  currentStep,
  formData,
  setFormData,
  setCurrentStep,
  onBack,
  onCreateCourse,
  loading,
  userId,
  userPlan = 'Free',
  creditInfo
}) => {
  const maxSteps = selectedTrack === 'Corporate' ? 4 : 5; // 4 for Corporate, 5 for Educational

    const canProceed = () => {
    // Debug logging
    console.log('canProceed check:', {
      selectedTrack,
      currentStep,
      formData,
      numberOfTopics: formData.numberOfTopics,
      numberOfQuizzes: formData.numberOfQuizzes
    });

    if (selectedTrack === 'Corporate') {
      // Corporate track: 4 steps
      switch (currentStep) {
        case 1: return formData.courseDescription && formData.courseDescription.trim().length > 0;
        case 2: return formData.learnerDescription && formData.learnerDescription.trim().length > 0;
        case 3: return true; // Course structure step - defaults are set automatically for free users
        case 4: return true; // PDF upload is optional
        default: return false;
      }
    } else {
      // Educational track: 5 steps
      switch (currentStep) {
        case 1: return formData.teachingLevel && formData.teachingLevel.trim().length > 0;
        case 2: return formData.courseDescription && formData.courseDescription.trim().length > 0;
        case 3: return formData.learnerDescription && formData.learnerDescription.trim().length > 0;
        case 4: return true; // Course structure step - defaults are set automatically for free users
        case 5: return true; // PDF upload is optional
        default: return false;
      }
    }
  };

  const getStepTitle = (step: number) => {
    if (selectedTrack === 'Corporate') {
      // Corporate track: 4 steps
      switch (step) {
        case 1: return 'Describe Your Course';
        case 2: return 'Describe Your Learner';
        case 3: return 'Course Structure';
        case 4: return 'Additional Content (Optional)';
        default: return '';
      }
    } else {
      // Educational track: 5 steps
      switch (step) {
        case 1: return 'Teaching Level';
        case 2: return 'Describe Your Course';
        case 3: return 'Describe Your Learner';
        case 4: return 'Course Structure';
        case 5: return 'Additional Content (Optional)';
        default: return '';
      }
    }
  };

  const getStepDescription = (step: number) => {
    if (selectedTrack === 'Corporate') {
      // Corporate track: 4 steps
      switch (step) {
        case 1: return 'Tell us what you want to teach and what your course is about.';
        case 2: return 'Describe who will be taking this course and their background.';
        case 3: return 'Choose how many topics and quizzes your course will have. Quizzes are automatically generated based on your course content.';
        case 4: return 'Upload a PDF to extract additional content for your course.';
        default: return '';
      }
    } else {
      // Educational track: 5 steps
      switch (step) {
        case 1: return 'Select the educational level you are teaching to help create age-appropriate content.';
        case 2: return 'Tell us what you want to teach and what your course is about.';
        case 3: return 'Describe who will be taking this course and their background.';
        case 4: return 'Choose how many topics and quizzes your course will have. Quizzes are automatically generated based on your course content.';
        case 5: return 'Upload a PDF to extract additional content for your course.';
        default: return '';
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center space-x-2 mb-3 sm:mb-4">
          {selectedTrack === 'Corporate' ? <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" /> : <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />}
          <h2 className="text-xl sm:text-2xl font-bold">Let's Build Your {selectedTrack} Course</h2>
        </div>
        
        <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
          I'll guide you through {maxSteps} simple steps to create the perfect learning experience.
        </p>
        
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Step {currentStep} of {maxSteps}</span>
            <span className="text-xs sm:text-sm text-gray-500">{Math.round((currentStep / maxSteps) * 100)}%</span>
          </div>
          <Progress value={(currentStep / maxSteps) * 100} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6">
            {selectedTrack === 'Corporate' ? (
              // Corporate track: 4 steps
              <>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 1 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                  <span className="text-xs sm:text-sm">Course</span>
                </div>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 2 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                  <span className="text-xs sm:text-sm">Learner</span>
                </div>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 3 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    3
                  </div>
                  <span className="text-xs sm:text-sm">Structure</span>
                </div>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 4 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 4 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    4
                  </div>
                  <span className="text-xs sm:text-sm">Content</span>
                </div>
              </>
            ) : (
              // Educational track: 5 steps
              <>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 1 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                  <span className="text-xs sm:text-sm">Level</span>
                </div>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 2 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                  <span className="text-xs sm:text-sm">Course</span>
                </div>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 3 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    3
                  </div>
                  <span className="text-xs sm:text-sm">Learner</span>
                </div>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 4 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 4 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    4
                  </div>
                  <span className="text-xs sm:text-sm">Structure</span>
                </div>
                <div className={`flex items-center space-x-1 sm:space-x-2 ${currentStep >= 5 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep >= 5 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    5
                  </div>
                  <span className="text-xs sm:text-sm">Content</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step Title and Description */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">{getStepTitle(currentStep)}</h3>
          <p className="text-sm sm:text-base text-gray-600">{getStepDescription(currentStep)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 shadow-sm border">
        {selectedTrack === 'Corporate' ? (
          <CorporateStepRenderer 
            currentStep={currentStep} 
            formData={formData} 
            setFormData={setFormData} 
            userId={userId}
            userPlan={userPlan}
            creditInfo={creditInfo}
          />
        ) : (
          <EducationalStepRenderer 
            step={currentStep} 
            formData={formData} 
            onFormDataChange={setFormData} 
            userId={userId}
            userPlan={userPlan}
            creditInfo={creditInfo}
          />
        )}
      </div>

      {/* Credit consumption notice */}
      {currentStep === maxSteps && creditInfo && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Coins className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-blue-800">
              Course creation will consume 1 credit. You have {creditInfo.availableCredits} credits available.
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between mt-6 sm:mt-8 space-y-3 sm:space-y-0">
        <button
          onClick={onBack}
          className="px-4 sm:px-6 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base touch-target"
        >
          Back
        </button>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          {currentStep < maxSteps ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 rounded-lg font-medium text-sm sm:text-base touch-target ${
                canProceed()
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Continue →</span>
            </button>
          ) : (
            <button
              onClick={onCreateCourse}
              disabled={loading || !canProceed()}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 rounded-lg font-medium text-sm sm:text-base touch-target ${
                loading || !canProceed()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Create Course</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCreatorSteps;
