
import React, { useState } from 'react';
import { Shield, UserX } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';

interface PeopleActionButtonsProps {
  person: any;
  currentUser: any;
  loading: string | null;
  onRoleChange: (userId: string, newRole: "Admin" | "Standard") => void;
  onRemoveUser: (userId: string, userName: string) => void;
}

const PeopleActionButtons: React.FC<PeopleActionButtonsProps> = ({
  person,
  currentUser,
  loading,
  onRoleChange,
  onRemoveUser
}) => {
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState<"Admin" | "Standard" | null>(null);

  const isCurrentUser = person.id === currentUser?.id;
  const isLoadingUser = loading === person.id;

  if (isCurrentUser) {
    return null;
  }

  const handleRoleChangeClick = (newRole: "Admin" | "Standard") => {
    setPendingRole(newRole);
    setShowRoleConfirm(true);
  };

  const confirmRoleChange = () => {
    if (pendingRole) {
      onRoleChange(person.id, pendingRole);
    }
    setShowRoleConfirm(false);
    setPendingRole(null);
  };

  const confirmRemoveUser = () => {
    onRemoveUser(person.id, person.full_name);
    setShowRemoveConfirm(false);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {person.role !== 'Admin' && (
          <button
            onClick={() => handleRoleChangeClick('Admin')}
            disabled={isLoadingUser}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
            title="Make Admin"
          >
            <Shield className="h-3 w-3" />
            <span>Make Admin</span>
          </button>
        )}
        {person.role === 'Admin' && (
          <button
            onClick={() => handleRoleChangeClick('Standard')}
            disabled={isLoadingUser}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
            title="Remove Admin"
          >
            <Shield className="h-3 w-3" />
            <span>Remove Admin</span>
          </button>
        )}
        <button
          onClick={() => setShowRemoveConfirm(true)}
          disabled={isLoadingUser}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
          title="Remove User"
        >
          <UserX className="h-3 w-3" />
          <span>Remove</span>
        </button>
      </div>

      <ConfirmationDialog
        isOpen={showRoleConfirm}
        onClose={() => {
          setShowRoleConfirm(false);
          setPendingRole(null);
        }}
        onConfirm={confirmRoleChange}
        title={`Change Role to ${pendingRole}`}
        message={`Are you sure you want to change ${person.full_name}'s role to ${pendingRole}? This will ${pendingRole === 'Admin' ? 'give them administrative privileges' : 'remove their administrative privileges'}.`}
        confirmText="Change Role"
        variant="warning"
        loading={isLoadingUser}
      />

      <ConfirmationDialog
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={confirmRemoveUser}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${person.full_name} from the team? This action cannot be undone and will permanently delete all their data including:\n\n• Course assignments and progress\n• Performance data and session history\n• Any courses they created\n• All related account information\n\nThe license count will be adjusted accordingly.`}
        confirmText="Remove User"
        variant="danger"
        loading={isLoadingUser}
      />
    </>
  );
};

export default PeopleActionButtons;
