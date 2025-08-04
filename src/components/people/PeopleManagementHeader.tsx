
import React, { useState } from 'react';
import { Plus, BookOpen, Users, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

interface PeopleManagementHeaderProps {
  isAdmin: boolean;
  licenseInfo: {
    purchased: number;
    used: number;
  };
  onInviteClick: () => void;
  onAssignmentClick: () => void;
  onTeamClick: () => void;
  onRefresh?: () => void;
  lastUpdated?: Date;
}

const PeopleManagementHeader: React.FC<PeopleManagementHeaderProps> = ({
  isAdmin,
  licenseInfo,
  onInviteClick,
  onAssignmentClick,
  onTeamClick,
  onRefresh,
  lastUpdated
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const availableLicenses = licenseInfo.purchased - licenseInfo.used;
  const isAtLimit = availableLicenses === 0;

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      console.log('🔄 Manual refresh triggered by user');
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const formatLastUpdated = (date?: Date) => {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 30) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    
    return date.toLocaleTimeString();
  };

  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">People Management</h2>
        <p className="text-gray-600 mt-2">
          {isAdmin ? (
            <>
              Licenses: {licenseInfo.used}/{licenseInfo.purchased} used • {availableLicenses} available
              {isAtLimit && (
                <span className="inline-flex items-center ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  At limit
                </span>
              )}
            </>
          ) : (
            <>View all team members and their assignments</>
          )}
        </p>
        <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
          <Clock className="h-3 w-3" />
          <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
          <span>•</span>
          <span className="text-green-600">Auto-sync enabled</span>
        </div>
      </div>
      
      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors ${
              isRefreshing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gray-500 hover:bg-gray-600'
            }`}
            title="Refresh team member data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          
          <button
            onClick={onTeamClick}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Users className="h-4 w-4" />
            <span>Manage Teams</span>
          </button>
          
          <button
            onClick={onAssignmentClick}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Assign Courses</span>
          </button>
          
          <button
            onClick={onInviteClick}
            disabled={isAtLimit}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isAtLimit 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            title={isAtLimit ? 'No available licenses. Please upgrade your plan.' : 'Add People'}
          >
            <Plus className="h-4 w-4" />
            <span>Add People</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PeopleManagementHeader;
