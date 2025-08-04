
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCompanyContext } from '@/hooks/useCompanyContext';

const Profile: React.FC = () => {
  const { user, profile } = useAuth();
  const { getCompanyContext, loading: companyLoading } = useCompanyContext();
  const [companyName, setCompanyName] = useState<string>('');

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getFirstName = () => {
    const fullName = profile?.full_name || user?.full_name || '';
    const firstName = fullName.split(' ')[0] || '';
    return capitalizeFirstLetter(firstName);
  };

  const getLastName = () => {
    const fullName = profile?.full_name || user?.full_name || '';
    const nameParts = fullName.split(' ');
    const lastName = nameParts.slice(1).join(' ') || '';
    return capitalizeFirstLetter(lastName);
  };

  const getTeamDisplay = () => {
    const userTeams = profile?.team;
    
    if (!userTeams || (Array.isArray(userTeams) && userTeams.length === 0)) {
      return 'General';
    }
    
    if (Array.isArray(userTeams)) {
      return userTeams.join(', ');
    }
    
    if (typeof userTeams === 'string') {
      return userTeams || 'General';
    }
    
    return 'General';
  };

  useEffect(() => {
    const loadCompanyContext = async () => {
      if (profile) {
        try {
          const context = await getCompanyContext(profile);
          setCompanyName(context.company_name);
        } catch (error) {
          console.error('Error loading company context:', error);
          setCompanyName('Not specified');
        }
      }
    };

    loadCompanyContext();
  }, [profile, getCompanyContext]);

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              Personal Information
            </h3>
            <p className="text-sm text-muted-foreground">
              Your account information and group details.
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  value={getFirstName()}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm px-3 py-2"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  value={getLastName()}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm px-3 py-2"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm px-3 py-2"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyLoading ? 'Loading...' : companyName}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm px-3 py-2"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <input
                  type="text"
                  value={profile?.role || 'Not specified'}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm px-3 py-2"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teams
                </label>
                <input
                  type="text"
                  value={getTeamDisplay()}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm px-3 py-2"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
