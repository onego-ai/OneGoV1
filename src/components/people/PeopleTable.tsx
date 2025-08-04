
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
      const { data } = await (supabase as any)
        .from('individual_course_assignments')
        .select(`
          user_id,
          course_id,
          status,
          courses!individual_course_assignments_course_id_fkey (course_title)
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
      <div className="bg-gray-50 px-4 sm:px-6 py-3 border-b">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          Team Members ({people.length} total)
        </h3>
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden lg:block">
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

      {/* Mobile Card View */}
      <div className="lg:hidden">
        <div className="divide-y divide-gray-200">
          {people.map((person) => {
            const userAssignments = getUserAssignments(person.id);
            
            return (
              <div key={person.id} className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                    {person.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {person.full_name || 'Unknown User'}
                        {person.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-500">(You)</span>
                        )}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        person.role === 'Admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {person.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{person.email}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Team: {person.team || 'General'}</span>
                      <span>{new Date(person.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mb-3">
                      {userAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userAssignments.slice(0, 2).map((course, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              {course}
                            </span>
                          ))}
                          {userAssignments.length > 2 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{userAssignments.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No courses assigned</span>
                      )}
                    </div>
                    {isAdmin && person.id !== currentUser?.id && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRoleChange(person.id, person.role === 'Admin' ? 'Standard' : 'Admin')}
                          disabled={loading === person.id}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                          {loading === person.id ? 'Updating...' : 'Change Role'}
                        </button>
                        <button
                          onClick={() => handleRemoveUser(person.id, person.full_name)}
                          disabled={loading === person.id}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PeopleTable;
