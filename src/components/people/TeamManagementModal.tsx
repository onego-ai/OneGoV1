import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, X, Plus, Edit2, Trash2, Save, XCircle } from 'lucide-react';

interface Person {
  id: string;
  full_name: string;
  team?: string[];
  [key: string]: any;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  people: Person[];
  onTeamUpdate: () => void;
}

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  user,
  people,
  onTeamUpdate
}) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get all unique teams from all users
  const getAllTeams = () => {
    const allTeams = new Set<string>();
    people.forEach(person => {
      if (person.team && Array.isArray(person.team)) {
        person.team.forEach(t => allTeams.add(t));
      }
    });
    return Array.from(allTeams).sort();
  };

  const allTeams = getAllTeams();

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Team Name Required",
        description: "Please enter a team name.",
        variant: "destructive",
      });
      return;
    }

    if (allTeams.includes(newTeamName.trim())) {
      toast({
        title: "Team Already Exists",
        description: "This team name already exists. Please choose a different name.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Actually create the team by adding the current admin user to it
      const { error } = await supabase.rpc('add_user_to_team', {
        user_id: user.id,
        team_name: newTeamName.trim()
      });

      if (error) throw error;

      toast({
        title: "Team Created Successfully!",
        description: `"${newTeamName.trim()}" team has been created and you've been added to it.`,
      });
      setNewTeamName('');
      onTeamUpdate();
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamName: string) => {
    if (teamName === 'General') {
      toast({
        title: "Cannot Delete General Team",
        description: "The General team cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Remove this team from all users who have it
      const usersWithTeam = people.filter(p => p.team?.includes(teamName));
      
      if (usersWithTeam.length > 0) {
        for (const user of usersWithTeam) {
          const { error } = await supabase.rpc('remove_user_from_team', {
            user_id: user.id,
            team_name: teamName
          });
          if (error) throw error;
        }
      }

      toast({
        title: "Team Deleted",
        description: `"${teamName}" team has been deleted and removed from all members.`,
      });

      onTeamUpdate();
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenameTeam = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setEditingTeam(null);
      return;
    }

    if (allTeams.includes(newName.trim())) {
      toast({
        title: "Team Name Exists",
        description: "This team name already exists.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_team_name', {
        old_name: oldName,
        new_name: newName.trim()
      });

      if (error) throw error;

      toast({
        title: "Team Renamed",
        description: `Team renamed from "${oldName}" to "${newName.trim()}".`,
      });

      setEditingTeam(null);
      onTeamUpdate();
    } catch (error: any) {
      console.error('Error renaming team:', error);
      toast({
        title: "Rename Failed",
        description: "Failed to rename team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToTeam = async () => {
    if (selectedMembers.length === 0 || !selectedTeamForAssignment) {
      toast({
        title: "Selection Required",
        description: "Please select members and a team to assign them to.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      for (const memberId of selectedMembers) {
        const { error } = await supabase.rpc('add_user_to_team', {
          user_id: memberId,
          team_name: selectedTeamForAssignment
        });
        if (error) throw error;
      }

      toast({
        title: "Team Assignment Complete",
        description: `Successfully assigned ${selectedMembers.length} member(s) to ${selectedTeamForAssignment}.`,
      });

      setSelectedMembers([]);
      setSelectedTeamForAssignment('');
      onTeamUpdate();
    } catch (error: any) {
      console.error('Error assigning to team:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign members to team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeUserFromTeam = async (userId: string, teamName: string, userName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('remove_user_from_team', {
        user_id: userId,
        team_name: teamName
      });

      if (error) throw error;

      toast({
        title: "Member Removed",
        description: `${userName} has been removed from ${teamName} team.`,
      });

      onTeamUpdate();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to remove member from team.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getTeamMembers = (teamName: string) => {
    return people.filter(p => p.team?.includes(teamName) || (teamName === 'General' && (!p.team || p.team.length === 0)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Management
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Create New Team */}
          <div className="border-b pb-6">
            <h4 className="text-lg font-medium mb-3">Create New Team</h4>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name (e.g., Operations, Design)"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
              <button
                onClick={handleCreateTeam}
                disabled={loading || !newTeamName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>

          {/* Teams List Management */}
          <div className="border-b pb-6">
            <h4 className="text-lg font-medium mb-3">Manage Teams</h4>
            <div className="space-y-3">
              {allTeams.map(team => (
                <div key={team} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {editingTeam === team ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editTeamName}
                          onChange={(e) => setEditTeamName(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                          disabled={loading}
                        />
                        <button
                          onClick={() => handleRenameTeam(team, editTeamName)}
                          className="p-1 text-green-500 hover:text-green-700"
                          disabled={loading}
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingTeam(null)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          disabled={loading}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {team.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {team} {team === 'General' && '(default)'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getTeamMembers(team).length} member(s)
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {editingTeam !== team && team !== 'General' && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingTeam(team);
                          setEditTeamName(team);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                        title="Rename team"
                        disabled={loading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        title="Delete team"
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Team Assignment */}
          <div>
            <h4 className="text-lg font-medium mb-3">Assign Members to Teams</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Team for Assignment
              </label>
              <select
                value={selectedTeamForAssignment}
                onChange={(e) => setSelectedTeamForAssignment(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                <option value="">Choose a team...</option>
                {allTeams.map(team => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {people.map(member => (
                <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    id={member.id}
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMemberSelection(member.id)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    disabled={loading}
                  />
                  <label htmlFor={member.id} className="flex items-center flex-1 cursor-pointer">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                      {member.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {member.full_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Teams: {member.team?.join(', ') || 'General'}
                      </div>
                    </div>
                  </label>
                  
                  {/* Show current teams as removable badges */}
                  <div className="flex space-x-1">
                    {member.team?.map(teamName => (
                      <div key={teamName} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        <span>{teamName}</span>
                        {teamName !== 'General' && (
                          <button
                            onClick={() => removeUserFromTeam(member.id, teamName, member.full_name)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                            disabled={loading}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {selectedMembers.length > 0 && selectedTeamForAssignment && (
              <button
                onClick={handleAssignToTeam}
                disabled={loading}
                className="w-full mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Assigning...' : `Add ${selectedMembers.length} member(s) to ${selectedTeamForAssignment}`}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={loading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamManagementModal;
