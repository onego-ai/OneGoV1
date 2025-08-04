
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Auth from '@/components/Auth';
import TutoringSession from '@/components/TutoringSession';
import CourseModeSelector from '@/components/CourseModeSelector';
import SessionPerformanceAnalysis from '@/components/SessionPerformanceAnalysis';
import AuthProvider, { useAuth } from '@/components/auth/AuthProvider';
import MainLayout from '@/components/layout/MainLayout';
import ContentRenderer from '@/components/content/ContentRenderer';

const IndexContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, profile, loading, authInitialized, licenseCount } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [selectedMode, setSelectedMode] = useState<'chat' | 'reading' | null>(null);
  const [currentSession, setCurrentSession] = useState<{
    course: any;
    sessionData: any;
  } | undefined>(undefined);

  useEffect(() => {
    // Check if tab is specified in URL params
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleAuthSuccess = () => {
    // Auth state will be handled by the AuthProvider
  };

  const handleStartSession = (course: any) => {
    setActiveCourse(course);
    setSelectedMode(null);
    setActiveTab('mode-selection');
  };

  const handleSelectMode = (mode: 'chat' | 'reading') => {
    setSelectedMode(mode);
    setActiveTab('session');
  };

  const handleBackFromModeSelection = () => {
    setActiveCourse(null);
    setSelectedMode(null);
    setActiveTab('courses');
  };

  const handleEndSession = () => {
    setActiveCourse(null);
    setSelectedMode(null);
    setCurrentSession(undefined);
    setActiveTab('courses');
  };

  const handleShowPerformance = (sessionData: any) => {
    if (activeCourse) {
      setCurrentSession({
        course: activeCourse,
        sessionData: sessionData
      });
      setActiveTab('performance-analysis');
    }
  };

  const handleSessionPerformanceComplete = () => {
    setCurrentSession(undefined);
    setActiveCourse(null);
    // Redirect based on user role - Standard users to My Courses, Admins to admin courses view
    setActiveTab(profile?.role === 'Admin' ? 'courses' : 'my-courses');
  };

  const handleCourseCreated = () => {
    // Switch to courses tab after course creation
    setActiveTab('courses');
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setActiveTab('course-editor');
  };

  const handleBackFromEditor = () => {
    setEditingCourse(null);
    setActiveTab('courses');
  };

  // Show loading only if auth is not initialized
  if (loading || !authInitialized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <>
        <Auth onAuthSuccess={handleAuthSuccess} />
        <Toaster />
      </>
    );
  }

  // If in mode selection, show mode selector
  if (activeTab === 'mode-selection' && activeCourse) {
    return (
      <>
        <CourseModeSelector
          course={activeCourse}
          onSelectMode={handleSelectMode}
          onBack={handleBackFromModeSelection}
        />
        <Toaster />
      </>
    );
  }

  // If in session mode, show full-screen tutoring
  if (activeTab === 'session' && activeCourse && selectedMode) {
    return (
      <>
        <TutoringSession 
          course={activeCourse} 
          user={profile} 
          onEnd={handleEndSession}
          onShowPerformance={handleShowPerformance}
          initialMode={selectedMode}
        />
        <Toaster />
      </>
    );
  }

  // If showing performance analysis, show full-screen without sidebar
  if (activeTab === 'performance-analysis' && currentSession) {
    return (
      <>
        <SessionPerformanceAnalysis
          course={currentSession.course}
          user={profile}
          sessionData={currentSession.sessionData}
          onComplete={handleSessionPerformanceComplete}
        />
        <Toaster />
      </>
    );
  }

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      profile={profile}
      licenseCount={licenseCount}
    >
      <ContentRenderer
        activeTab={activeTab}
        profile={profile}
        user={user}
        onStartSession={handleStartSession}
        onCourseCreated={handleCourseCreated}
        currentSession={currentSession}
        onSessionPerformanceComplete={handleSessionPerformanceComplete}
        onEditCourse={handleEditCourse}
        editingCourse={editingCourse}
        onBackFromEditor={handleBackFromEditor}
      />
    </MainLayout>
  );
};

const Index: React.FC = () => {
  return (
    <AuthProvider>
      <IndexContent />
    </AuthProvider>
  );
};

export default Index;
