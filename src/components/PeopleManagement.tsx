
import React, { useState } from 'react';
import LicenseUsageCard from './people/LicenseUsageCard';
import PendingInvitations from './people/PendingInvitations';
import PeopleTable from './people/PeopleTable';
import InviteModal from './people/InviteModal';
import CourseAssignmentModal from './people/CourseAssignmentModal';
import TeamManagementModal from './people/TeamManagementModal';
import PeopleManagementHeader from './people/PeopleManagementHeader';
import { usePeopleManagement } from './people/hooks/usePeopleManagement';
import { useInvitationHandling } from './people/hooks/useInvitationHandling';

interface PeopleManagementProps {
  user: any;
}

const PeopleManagement: React.FC<PeopleManagementProps> = ({ user }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState('Standard');

  const { people, loading, licenseInfo, invitations, loadData, lastUpdated } = usePeopleManagement(user);
  const { sendingInvites, handleInvitePeople } = useInvitationHandling(user, licenseInfo, invitations, loadData);

  const handleInviteSubmit = async () => {
    const success = await handleInvitePeople(inviteEmails, inviteRole);
    if (success) {
      setShowInviteModal(false);
      setInviteEmails('');
    }
  };

  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered from PeopleManagement');
    await loadData();
  };

  const availableLicenses = licenseInfo.purchased - licenseInfo.used;
  const isAdmin = user?.role === 'Admin';

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading people...</div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-8">
      <div className="max-w-full mx-auto">
        <PeopleManagementHeader
          isAdmin={isAdmin}
          licenseInfo={licenseInfo}
          onInviteClick={() => setShowInviteModal(true)}
          onAssignmentClick={() => setShowAssignmentModal(true)}
          onTeamClick={() => setShowTeamModal(true)}
          onRefresh={handleManualRefresh}
          lastUpdated={lastUpdated}
        />

        {isAdmin && (
          <>
            <LicenseUsageCard licenseInfo={licenseInfo} />
            <PendingInvitations 
              invitations={invitations} 
              onInvitationUpdate={loadData}
              user={user}
            />
          </>
        )}
        
        <PeopleTable 
          people={people} 
          currentUser={user}
          onPeopleUpdate={loadData}
        />
        
        {isAdmin && (
          <>
            <InviteModal
              showModal={showInviteModal}
              onClose={() => setShowInviteModal(false)}
              inviteEmails={inviteEmails}
              setInviteEmails={setInviteEmails}
              inviteRole={inviteRole}
              setInviteRole={setInviteRole}
              availableLicenses={availableLicenses}
              onInvite={handleInviteSubmit}
              loading={sendingInvites}
            />
            
            <CourseAssignmentModal
              isOpen={showAssignmentModal}
              onClose={() => setShowAssignmentModal(false)}
              user={user}
              onAssignmentComplete={loadData}
            />
            
            <TeamManagementModal
              isOpen={showTeamModal}
              onClose={() => setShowTeamModal(false)}
              user={user}
              people={people}
              onTeamUpdate={loadData}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PeopleManagement;
