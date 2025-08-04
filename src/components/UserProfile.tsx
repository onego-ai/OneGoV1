
import React, { useState, useEffect } from 'react';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfileProps {
  user: {
    id?: string;
    full_name: string;
    email: string;
    role: string;
    plan: string;
    team?: string[] | string;
  };
  onTabChange: (tab: string) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onTabChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [latestPlan, setLatestPlan] = useState(user.plan);

  useEffect(() => {
    const fetchLatestProfile = async () => {
      if (isOpen && (user.email || user.id)) {
        try {
          console.log('Fetching latest plan for user:', { email: user.email, id: user.id });
          
          let query = supabase.from('profiles').select('plan');
          
          // Try by ID first, then by email
          if (user.id) {
            query = query.eq('id', user.id);
          } else if (user.email) {
            query = query.eq('email', user.email);
          }
          
          const { data, error } = await query.single();
          
          console.log('Latest plan fetch result:', { data, error });
          
          if (error) {
            console.error('Error fetching latest plan:', error);
            return;
          }
          
          if (data && data.plan) {
            console.log('Setting latest plan to:', data.plan);
            setLatestPlan(data.plan);
          }
        } catch (error) {
          console.error('Error fetching latest plan:', error);
        }
      }
    };
    
    fetchLatestProfile();
  }, [isOpen, user.email, user.id]);

  // Also fetch when component mounts to ensure we have the latest plan
  useEffect(() => {
    const fetchInitialPlan = async () => {
      if (user.email || user.id) {
        try {
          console.log('Fetching initial plan for user:', { email: user.email, id: user.id });
          
          let query = supabase.from('profiles').select('plan');
          
          // Try by ID first, then by email
          if (user.id) {
            query = query.eq('id', user.id);
          } else if (user.email) {
            query = query.eq('email', user.email);
          }
          
          const { data, error } = await query.single();
          
          console.log('Initial plan fetch result:', { data, error });
          
          if (!error && data && data.plan) {
            console.log('Setting initial plan to:', data.plan);
            setLatestPlan(data.plan);
          }
        } catch (error) {
          console.error('Error fetching initial plan:', error);
        }
      }
    };
    
    fetchInitialPlan();
  }, [user.email, user.id]);

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getCapitalizedFullName = () => {
    if (!user.full_name) return 'Unknown User';
    const nameParts = user.full_name.split(' ');
    return nameParts.map(part => capitalizeFirstLetter(part)).join(' ');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTeamDisplay = () => {
    if (!user.team) return 'General';
    if (Array.isArray(user.team)) {
      return user.team.length > 0 ? user.team.join(', ') : 'General';
    }
    return user.team || 'General';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Use the latest plan, fallback to user.plan if latestPlan is not available
  const displayPlan = latestPlan || user.plan;
  
  console.log('Current plan state:', { 
    userPlan: user.plan, 
    latestPlan, 
    displayPlan,
    userEmail: user.email,
    userId: user.id 
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 sm:space-x-2 bg-white rounded-full p-1.5 sm:p-2 shadow-sm hover:shadow-md transition-shadow touch-target"
      >
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
          {getInitials(user.full_name)}
        </div>
        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
            <div className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 border-b">
              <div className="font-medium truncate">{getCapitalizedFullName()}</div>
              <div className="text-gray-500 truncate">{user.email}</div>
              <div className="text-xs text-green-600 mt-1">{user.role} • {capitalizeFirstLetter(displayPlan)}</div>
              <div className="text-xs text-blue-600 mt-1 truncate">Teams: {getTeamDisplay()}</div>
            </div>
            <button
              onClick={() => {
                onTabChange('profile');
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 touch-target"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
              <span>Profile</span>
            </button>
            {/* Settings button - only visible to Admin users */}
            {user.role === 'Admin' && (
              <button
                onClick={() => {
                  onTabChange('settings');
                  setIsOpen(false);
                }}
                className="flex items-center w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 touch-target"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                <span>Settings</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-gray-100 touch-target"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfile;
