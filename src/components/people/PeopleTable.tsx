
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PeopleTableHeader from './components/PeopleTableHeader';
import PeopleTableRow from './components/PeopleTableRow';
import { usePeopleActions } from './hooks/usePeopleActions';

interface Person {
  id: string;
  full_name: string;
  role: string;
  plan: string;
  team?: string;
  created_at: string;
  [key: string]: any;
}

interface PeopleTableProps {
  people: Person[];
  currentUser?: any;
  onPeopleUpdate?: () => void;
}

const PeopleTable: React.FC<PeopleTableProps> = ({ people, currentUser, onPeopleUpdate }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const { loading, isAdmin, handleRoleChange, handleRemoveUser } = usePeopleActions(currentUser, onPeopleUpdate);

  useEffect(() => {
    loadAssignments();
  }, [people]);

  const loadAssignments = async () => {
    if (people.length === 0) return;

    try {
      const userIds = people.map(p => p.id);
      const { data } = await supabase
        .from('user_course_assignments')
        .select(`
          user_id,
          course_id,
          status,
          courses!user_course_assignments_course_id_fkey (course_title)
        `)
        .in('user_id', userIds);

      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const getUserAssignments = (userId: string) => {
    return assignments
      .filter(a => a.user_id === userId)
      .map(a => a.courses?.course_title || 'Unknown Course');
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="bg-gray-50 px-6 py-3 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Team Members ({people.length} total)
        </h3>
      </div>
      
      <table className="w-full">
        <PeopleTableHeader isAdmin={isAdmin} />
        <tbody className="bg-white divide-y divide-gray-200">
          {people.map((person) => {
            const userAssignments = getUserAssignments(person.id);
            
            return (
              <PeopleTableRow
                key={person.id}
                person={person}
                currentUser={currentUser}
                userAssignments={userAssignments}
                isAdmin={isAdmin}
                loading={loading}
                onRoleChange={handleRoleChange}
                onRemoveUser={handleRemoveUser}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PeopleTable;
