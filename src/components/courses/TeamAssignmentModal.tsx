
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, X, Loader2 } from 'lucide-react';

interface TeamAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: any;
  user: any;
  people: any[];
}

const TeamAssignmentModal: React.FC<TeamAssignmentModalProps> = ({
  isOpen,
  onClose,
  course,
  user,
  people
}) => {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
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

  const getTeamMembers = (teamName: string) => {
    return people.filter(p => p.team?.includes(teamName) || (teamName === 'General' && (!p.team || p.team.length === 0)));
  };

  const handleTeamToggle = (teamName: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamName)
        ? prev.filter(t => t !== teamName)
        : [...prev, teamName]
    );
  };

  const handleAssignToTeams = async () => {
    if (selectedTeams.length === 0) {
      toast({
        title: "No Teams Selected",
        description: "Please select at least one team to assign the course to.",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      const assignments = [];
      
      // Get all unique users from selected teams
      const usersToAssign = new Set<string>();
      selectedTeams.forEach(teamName => {
        const teamMembers = getTeamMembers(teamName);
        teamMembers.forEach(member => usersToAssign.add(member.id));
      });

      // Create individual assignments for each user
      for (const userId of usersToAssign) {
        assignments.push({
          user_id: userId,
          course_id: course.id,
          assigned_by: user.id,
          assigned_to_team: selectedTeams.join(', '),
          status: 'assigned'
        });
      }

      const { error } = await supabase
        .from('individual_course_assignments')
        .upsert(assignments, { 
          onConflict: 'user_id,course_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: "Course Assigned Successfully",
        description: `"${course.course_title}" has been assigned to ${usersToAssign.size} member(s) across ${selectedTeams.length} team(s).`,
      });

      setSelectedTeams([]);
      onClose();
    } catch (error: any) {
      console.error('Error assigning course:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign course to teams.",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Assign Course to Teams
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={assigning}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-900 mb-2">Course:</div>
          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {course.course_title}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm font-medium text-gray-900 mb-3">
            Select Teams to Assign:
          </div>
          <div className="space-y-2">
            {allTeams.map(team => {
              const memberCount = getTeamMembers(team).length;
              return (
                <div key={team} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id={team}
                    checked={selectedTeams.includes(team)}
                    onChange={() => handleTeamToggle(team)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={assigning}
                  />
                  <label htmlFor={team} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                          {team.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {team}
                          </div>
                          <div className="text-xs text-gray-500">
                            {memberCount} member{memberCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={assigning}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssignToTeams}
            disabled={assigning || selectedTeams.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              `Assign to ${selectedTeams.length} Team${selectedTeams.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamAssignmentModal;
