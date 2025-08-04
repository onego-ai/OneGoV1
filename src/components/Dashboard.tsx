
import React from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import AdminDashboard from './dashboard/AdminDashboard';
import StandardDashboard from './dashboard/StandardDashboard';

interface DashboardProps {
  user: any;
  onStartSession: (courseId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onStartSession }) => {
  const { courses, assignedCourses, performance, loading } = useDashboardData(user);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (user.role === 'Admin') {
    return (
      <AdminDashboard 
        courses={courses}
        performance={performance}
        onStartSession={onStartSession}
      />
    );
  }

  return (
    <StandardDashboard 
      assignedCourses={assignedCourses}
      performance={performance}
      onStartSession={onStartSession}
    />
  );
};

export default Dashboard;
