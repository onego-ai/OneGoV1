
import React from 'react';

export const getStatusBadge = (status: string) => {
  const statusConfig = {
    active: { color: 'bg-green-100 text-green-800', label: 'Active' },
    inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

export const getTeamBadge = (teams: string[] | string | null | undefined) => {
  // Handle different team formats
  let teamArray: string[] = [];
  
  if (Array.isArray(teams)) {
    teamArray = teams;
  } else if (typeof teams === 'string') {
    teamArray = [teams];
  } else {
    teamArray = ['General'];
  }

  // Remove empty strings and ensure General is default
  teamArray = teamArray.filter(team => team && team.trim() !== '');
  if (teamArray.length === 0) {
    teamArray = ['General'];
  }

  return (
    <div className="flex flex-wrap gap-1">
      {teamArray.map((team, index) => (
        <span
          key={index}
          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800"
        >
          {team}
        </span>
      ))}
    </div>
  );
};

export const getRoleBadge = (role: string) => {
  const roleConfig = {
    Admin: { color: 'bg-purple-100 text-purple-800', label: 'Admin' },
    Standard: { color: 'bg-gray-100 text-gray-800', label: 'Standard' }
  };

  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.Standard;
  
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};
