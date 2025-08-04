
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, X } from 'lucide-react';

interface CourseAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onAssignmentComplete: () => void;
}

const CourseAssignmentModal: React.FC<CourseAssignmentModalProps> = ({
  isOpen,
  onClose,
  user,
  onAssignmentComplete
}) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [filterTeam, setFilterTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, user]);

  const loadData = async () => {
    try {
      // Load published courses created by this admin
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      setCourses(coursesData || []);

      // Load team members from the same group with their current assignments
      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('group_id', user.group_id)
        .neq('id', user.id) // Exclude the admin themselves
        .order('team')
        .order('full_name');

      setTeamMembers(membersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleAssignCourse = async () => {
    if (!selectedCourse || selectedMembers.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select a course and at least one team member.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create individual assignments for each selected member
      const assignments = selectedMembers.map(memberId => ({
        user_id: memberId,
        course_id: selectedCourse,
        assigned_by: user.id,
        status: 'assigned'
      }));

      // Use upsert to handle potential duplicates gracefully
      const { error } = await supabase
        .from('user_course_assignments')
        .upsert(assignments, { 
          onConflict: 'user_id,course_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Assignment error:', error);
        throw error;
      }

      const selectedCourseTitle = courses.find(c => c.id === selectedCourse)?.course_title || 'Course';

      toast({
        title: "Course Assigned",
        description: `Successfully assigned "${selectedCourseTitle}" to ${selectedMembers.length} team member(s).`,
      });

      // Reset form
      setSelectedCourse('');
      setSelectedMembers([]);
      onAssignmentComplete();
      onClose();
    } catch (error: any) {
      console.error('Error assigning course:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign course. Please try again.",
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

  const toggleSelectAll = () => {
    const filteredMembers = getFilteredMembers();
    const allSelected = filteredMembers.every(member => selectedMembers.includes(member.id));
    
    if (allSelected) {
      // Deselect all filtered members
      setSelectedMembers(prev => prev.filter(id => !filteredMembers.some(m => m.id === id)));
    } else {
      // Select all filtered members
      const newSelections = filteredMembers.map(m => m.id);
      setSelectedMembers(prev => [...new Set([...prev, ...newSelections])]);
    }
  };

  const getFilteredMembers = () => {
    return teamMembers.filter(member => 
      !filterTeam || member.team === filterTeam || (filterTeam === 'General' && !member.team)
    );
  };

  const teams = [...new Set(teamMembers.map(m => m.team || 'General'))].sort();
  const filteredMembers = getFilteredMembers();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Assign Course to Team Members
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Course Selection */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.course_title} ({course.track_type})
                  </option>
                ))}
              </select>
              {courses.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No published courses available. Create and publish a course first.
                </p>
              )}
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Team
              </label>
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Team Member Selection */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Team Members ({selectedMembers.length} selected)
                </label>
                {filteredMembers.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {filteredMembers.every(member => selectedMembers.includes(member.id)) 
                      ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              
              {teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No team members found. Invite people to your team first.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {filteredMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        id={member.id}
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor={member.id} className="flex items-center flex-1 cursor-pointer">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                          {member.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.role} • {member.team || 'General'} Team
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            onClick={handleAssignCourse}
            disabled={loading || !selectedCourse || selectedMembers.length === 0}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Assigning...' : `Assign to ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseAssignmentModal;
