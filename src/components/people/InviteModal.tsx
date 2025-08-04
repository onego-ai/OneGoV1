
import React from 'react';
import { Send, AlertTriangle } from 'lucide-react';

interface InviteModalProps {
  showModal: boolean;
  onClose: () => void;
  inviteEmails: string;
  setInviteEmails: (emails: string) => void;
  inviteRole: string;
  setInviteRole: (role: string) => void;
  availableLicenses: number;
  onInvite: () => void;
  loading?: boolean;
}

const InviteModal: React.FC<InviteModalProps> = ({
  showModal,
  onClose,
  inviteEmails,
  setInviteEmails,
  inviteRole,
  setInviteRole,
  availableLicenses,
  onInvite,
  loading = false
}) => {
  if (!showModal) return null;

  const emailCount = inviteEmails.split('\n').filter(email => email.trim()).length;
  const isOverLimit = emailCount > availableLicenses;
  const canInvite = emailCount > 0 && !isOverLimit && !loading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Invite Team Members</h3>
        
        <div className={`mb-4 p-3 rounded-lg ${
          availableLicenses === 0 
            ? 'bg-red-50 border border-red-200' 
            : isOverLimit 
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-blue-50'
        }`}>
          <div className="flex items-center">
            {(availableLicenses === 0 || isOverLimit) && (
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
            )}
            <p className={`text-sm ${
              availableLicenses === 0 
                ? 'text-red-800' 
                : isOverLimit 
                  ? 'text-yellow-800'
                  : 'text-blue-800'
            }`}>
              Available licenses: <strong>{availableLicenses}</strong>
              {emailCount > 0 && (
                <span className="ml-2">
                  • Inviting: <strong>{emailCount}</strong>
                </span>
              )}
            </p>
          </div>
          {isOverLimit && (
            <p className="text-xs text-yellow-700 mt-1">
              You're trying to invite more people than you have available licenses. Please reduce the number of invitations or upgrade your plan.
            </p>
          )}
          {availableLicenses === 0 && (
            <p className="text-xs text-red-700 mt-1">
              You have no available licenses. Please upgrade your plan to invite more people.
            </p>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Addresses (one per line)
            </label>
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="user1@example.com&#10;user2@example.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              rows={4}
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={loading}
            >
              <option value="Standard">Standard User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onInvite}
            disabled={!canInvite}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              canInvite
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>{loading ? 'Sending...' : 'Send Invitations'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
