
import React from 'react';
import Dashboard from '@/components/Dashboard';
import AdminCoursesView from '@/components/AdminCoursesView';
import CourseCreator from '@/components/CourseCreator';
import CourseEditor from '@/components/CourseEditor';
import CoursesView from '@/components/CoursesView';
import PeopleManagement from '@/components/PeopleManagement';
import PerformanceReports from '@/components/PerformanceReports';
import MyPerformance from '@/components/MyPerformance';
import UserProfile from '@/components/UserProfile';
import PricingPage from '@/components/PricingPage';
import AccountSettings from '@/components/AccountSettings';
import Profile from '@/components/Profile';
import HonestBox from '@/components/HonestBox';
import { useCreditInfo } from '@/hooks/useCreditInfo';

interface ContentRendererProps {
  activeTab: string;
  profile: any;
  user: any;
  onStartSession: (course: any) => void;
  onCourseCreated: (course: any) => void;
  onEditCourse: (course: any) => void;
  onBackFromEditor: () => void;
  editingCourse: any;
  currentSession: any;
  onSessionPerformanceComplete: () => void;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({
  activeTab,
  profile,
  user,
  onStartSession,
  onCourseCreated,
  onEditCourse,
  onBackFromEditor,
  editingCourse,
  currentSession,
  onSessionPerformanceComplete
}) => {
  const { creditInfo } = useCreditInfo();
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={profile} onStartSession={onStartSession} />;
      
      case 'courses':
        return <AdminCoursesView user={profile} onStartSession={onStartSession} onEditCourse={onEditCourse} />;
      
      case 'course-creator':
        return <CourseCreator 
          userId={profile?.id} 
          onCourseCreated={onCourseCreated}
          userPlan={profile?.plan}
          creditInfo={creditInfo}
        />;
      
      case 'course-editor':
        return editingCourse ? (
          <CourseEditor 
            course={editingCourse} 
            user={profile} 
            onBack={onBackFromEditor}
            onSave={(updatedCourse) => {
              // Handle course save and return to courses view
              onBackFromEditor();
            }}
          />
        ) : (
          <Dashboard user={profile} onStartSession={onStartSession} />
        );
      
      case 'my-courses':
        return <CoursesView user={profile} onStartSession={onStartSession} />;
      
      case 'people':
        return <PeopleManagement user={profile} />;
      
      case 'performance':
        return <PerformanceReports user={profile} />;
      
      case 'my-performance':
        return <MyPerformance user={profile} />;
      
      case 'honest-box':
        return <HonestBox />;
      
      case 'profile':
        return <Profile />;
      
      case 'upgrade':
        return <PricingPage />;
      
      case 'settings':
        // Only show Settings for Admin users
        return profile?.role === 'Admin' ? <AccountSettings /> : <Dashboard user={profile} onStartSession={onStartSession} />;
      
      default:
        return <Dashboard user={profile} onStartSession={onStartSession} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {renderContent()}
    </div>
  );
};

export default ContentRenderer;
