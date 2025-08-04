import React, { useState } from 'react';
import { getStatusBadge, getTeamBadge, getRoleBadge } from '../utils/badgeUtils';
import PeopleActionButtons from './PeopleActionButtons';
import CourseAssignmentsModal from './CourseAssignmentsModal';

interface PeopleTableRowProps {
  person: any;
  currentUser: any;
  userAssignments: string[];
  isAdmin: boolean;
  loading: string | null;
  onRoleChange: (userId: string, newRole: "Admin" | "Standard") => void;
  onRemoveUser: (userId: string, userName: string) => void;
}

const PeopleTableRow: React.FC<PeopleTableRowProps> = ({
  person,
  currentUser,
  userAssignments,
  isAdmin,
  loading,
  onRoleChange,
  onRemoveUser
}) => {
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const isCurrentUser = person.id === currentUser?.id;

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getCapitalizedFullName = () => {
    if (!person.full_name) return 'Unknown User';
    const nameParts = person.full_name.split(' ');
    return nameParts.map(part => capitalizeFirstLetter(part)).join(' ');
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
              {person.full_name?.charAt(0) || 'U'}
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {getCapitalizedFullName()}
                {isCurrentUser && (
                  <span className="ml-2 text-xs text-gray-500">(You)</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {person.email || currentUser?.email || ''}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {getTeamBadge(person.team || 'General')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {getRoleBadge(person.role)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {userAssignments.length > 0 ? (
            <button
              onClick={() => setShowAssignmentsModal(true)}
              className="flex flex-wrap gap-1 hover:opacity-80 transition-opacity"
            >
              {userAssignments.slice(0, 2).map((course, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                >
                  {course}
                </span>
              ))}
              {userAssignments.length > 2 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                  +{userAssignments.length - 2} more
                </span>
              )}
            </button>
          ) : (
            <span className="text-sm text-gray-500">No courses assigned</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {getStatusBadge('active')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(person.created_at).toLocaleDateString()}
        </td>
        {isAdmin && (
          <td className="px-6 py-4 whitespace-nowrap">
            <PeopleActionButtons
              person={person}
              currentUser={currentUser}
              loading={loading}
              onRoleChange={onRoleChange}
              onRemoveUser={onRemoveUser}
            />
          </td>
        )}
      </tr>

      <CourseAssignmentsModal
        isOpen={showAssignmentsModal}
        onClose={() => setShowAssignmentsModal(false)}
        person={person}
        userAssignments={userAssignments}
      />
    </>
  );
};

export default PeopleTableRow;
