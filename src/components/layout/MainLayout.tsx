
import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import Sidebar from '@/components/Sidebar';
import UserProfile from '@/components/UserProfile';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: any;
  licenseCount: number;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  profile,
  licenseCount
}) => {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const { getCompanyContext } = useCompanyContext();

  useEffect(() => {
    const loadCompanyLogo = async () => {
      try {
        const context = await getCompanyContext(profile);
        setCompanyLogo(context.company_logo);
      } catch (error) {
        console.error('Error loading company logo:', error);
      }
    };

    if (profile) {
      loadCompanyLogo();
    }
  }, [profile, getCompanyContext]);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar 
        activeView={activeTab} 
        onViewChange={onTabChange} 
        user={profile}
        onLogout={() => {
          window.location.reload();
        }}
      />
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt={profile.company_name || "Company Logo"} 
                className="h-8 max-w-32 object-contain"
              />
            ) : (
              <img 
                src="https://onego.ai/wp-content/uploads/2025/01/ONEGO-Logo-e1737199296102.png" 
                alt="ONEGO Learning" 
                className="h-8"
              />
            )}
          </div>
          <UserProfile user={profile} onTabChange={onTabChange} />
        </header>
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      
      <Toaster />
    </div>
  );
};

export default MainLayout;
