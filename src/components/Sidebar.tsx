import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  User, 
  Settings,
  Menu,
  X,
  Plus,
  LogOut,
  Home,
  Crown,
  MessageCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  user: any;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getCapitalizedFullName = () => {
    if (!user?.full_name) return 'User';
    const nameParts = user.full_name.split(' ');
    return nameParts.map(part => capitalizeFirstLetter(part)).join(' ');
  };

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Always keep sidebar closed on mobile by default
      if (mobile) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    ...(user?.role === 'Admin' ? [
      { id: 'courses', icon: BookOpen, label: 'Courses (Admin view)' },
      { id: 'course-creator', icon: Plus, label: 'Create Course' },
    ] : []),
    { id: 'my-courses', icon: BookOpen, label: 'My Courses' },
    { id: 'people', icon: Users, label: 'People' },
    { id: 'performance', icon: BarChart3, label: 'Performance' },
    { id: 'honest-box', icon: MessageCircle, label: 'HonestBox' },
    { id: 'profile', icon: User, label: 'Profile' },
    // Only show Upgrade tab for Free plan Admin users
    ...(user?.plan === 'Free' && user?.role === 'Admin' ? [
      { id: 'upgrade', icon: Crown, label: 'Upgrade', isUpgrade: true },
    ] : []),
    // Only show Settings for Admin users
    ...(user?.role === 'Admin' ? [
      { id: 'settings', icon: Settings, label: 'Settings' },
    ] : []),
  ];

  const handleItemClick = (viewId: string) => {
    onViewChange(viewId);
    // Close sidebar on mobile after selecting an item
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg lg:hidden border border-gray-200"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out lg:transition-none
        w-64 h-screen bg-white border-r border-gray-200 flex flex-col
        z-50 lg:z-auto
        shadow-lg lg:shadow-none
        overflow-hidden
        sidebar-fixed
      `}>
        {/* Header - show logo on both desktop and mobile */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-center">
            <img 
              src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png" 
              alt="ONEGO Learning" 
              className="h-6 sm:h-8 w-auto"
            />
          </div>
        </div>

        {/* User Info */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium text-sm sm:text-base">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                {getCapitalizedFullName()}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role || 'Member'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation - fixed height, no scroll */}
        <nav className="flex-1 p-3 sm:p-4">
          <ul className="space-y-1 sm:space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isUpgradeTab = item.isUpgrade;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors
                      ${isUpgradeTab 
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg hover:from-yellow-500 hover:to-yellow-700 transform hover:scale-105' 
                        : isActive 
                          ? 'bg-green-50 text-green-600 border border-green-200' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isUpgradeTab ? 'text-white' : ''}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ONEGO Branding - moved to bottom */}
        <div className="px-3 sm:px-4 py-2 flex-shrink-0">
          <div className="text-center">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-600">ONEGO</h2>
            <p className="text-xs text-gray-400">Learning Platform</p>
          </div>
        </div>

        {/* Logout */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
