
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, BookOpen, Award, ChevronDown, ChevronRight } from 'lucide-react';

interface PerformanceReportsProps {
  user: any;
}

interface CoursePerformanceGroup {
  courseTitle: string;
  courseId: string;
  members: any[];
  totalMembers: number;
  avgProgress: number;
  completed: number;
}

const PerformanceReports: React.FC<PerformanceReportsProps> = ({ user }) => {
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [courseGroups, setCourseGroups] = useState<CoursePerformanceGroup[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [teamStats, setTeamStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, [user]);

  const loadPerformanceData = async () => {
    try {
      if (user.role === 'Admin') {
        // Load performance data for all team members and group by course
        const { data } = await supabase
          .from('user_performance')
          .select(`
            *,
            profiles!user_performance_user_id_fkey (id, full_name, group_id, team),
            courses!user_performance_course_id_fkey (course_title, creator_id)
          `)
          .order('updated_at', { ascending: false });

        // Filter to show only performance for courses created by this admin and team members
        const filteredData = data?.filter(p => {
          const profile = p.profiles;
          
          // Type guard function to check if profile is valid
          const isValidProfile = (prof: any): prof is any => {
            return prof !== null && 
                   prof !== undefined && 
                   typeof prof === 'object' && 
                   'group_id' in prof &&
                   typeof prof.group_id === 'string';
          };
          
          // Use the type guard
          if (!isValidProfile(profile)) {
            return false;
          }
          
          // Now TypeScript knows profile is definitely valid
          return p.courses?.creator_id === user.id && 
                 profile.group_id === user.group_id;
        }) || [];

        setPerformanceData(filteredData);

        // Group performance data by course for admin view
        const courseGroupsMap = new Map<string, CoursePerformanceGroup>();
        
        filteredData.forEach(perf => {
          const courseId = perf.course_id;
          const courseTitle = perf.courses?.course_title || 'Unknown Course';
          
          if (!courseGroupsMap.has(courseId)) {
            courseGroupsMap.set(courseId, {
              courseTitle,
              courseId,
              members: [],
              totalMembers: 0,
              avgProgress: 0,
              completed: 0
            });
          }
          
          const group = courseGroupsMap.get(courseId)!;
          group.members.push({
            ...perf,
            userName: perf.profiles?.full_name || 'Unknown User',
            userTeam: perf.profiles?.team,
            // Calculate actual progress percentage based on interactions and course complexity
            actualProgress: Math.min((perf.total_interactions || 0) * 10, 100),
            interactions: perf.total_interactions || 0,
            status: perf.completed_at ? 'Completed' : (perf.progress > 0 ? 'In Progress' : 'Not Started')
          });
        });

        // Calculate statistics for each course group
        const courseGroupsArray = Array.from(courseGroupsMap.values()).map(group => {
          const totalProgress = group.members.reduce((sum, m) => sum + (m.actualProgress || 0), 0);
          const completed = group.members.filter(m => m.completed_at).length;
          
          return {
            ...group,
            totalMembers: group.members.length,
            avgProgress: group.members.length > 0 ? Math.round(totalProgress / group.members.length) : 0,
            completed
          };
        });

        setCourseGroups(courseGroupsArray);

        // Calculate team statistics
        const stats = {
          totalMembers: new Set(filteredData.map(p => p.user_id)).size,
          avgProgress: filteredData.length > 0 ? 
            Math.round(filteredData.reduce((sum, p) => sum + Math.min((p.total_interactions || 0) * 10, 100), 0) / filteredData.length) : 0,
          totalInteractions: filteredData.reduce((sum, p) => sum + (p.total_interactions || 0), 0),
          completedCourses: filteredData.filter(p => p.completed_at).length
        };
        setTeamStats(stats);
      } else {
        // Load only user's own performance (Standard user view)
        const { data } = await supabase
          .from('user_performance')
          .select(`
            *,
            courses!user_performance_course_id_fkey (course_title)
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        // Calculate actual progress for each course
        const enhancedData = data?.map(perf => ({
          ...perf,
          actualProgress: Math.min((perf.total_interactions || 0) * 10, 100),
          interactions: perf.total_interactions || 0
        })) || [];

        setPerformanceData(enhancedData);
        
        const stats = {
          totalCourses: enhancedData?.length || 0,
          avgProgress: enhancedData && enhancedData.length > 0 ? 
            Math.round(enhancedData.reduce((sum, p) => sum + (p.actualProgress || 0), 0) / enhancedData.length) : 0,
          totalInteractions: enhancedData?.reduce((sum, p) => sum + (p.interactions || 0), 0) || 0,
          completedCourses: enhancedData?.filter(p => p.completed_at).length || 0
        };
        setTeamStats(stats);
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseExpansion = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  // Prepare chart data
  const chartData = user.role === 'Admin' 
    ? courseGroups.slice(0, 10).map(group => ({
        name: group.courseTitle.length > 15 ? group.courseTitle.substring(0, 15) + '...' : group.courseTitle,
        progress: group.avgProgress,
        interactions: group.members.reduce((sum, m) => sum + (m.interactions || 0), 0)
      }))
    : performanceData.slice(0, 10).map(item => ({
        name: item.courses?.course_title?.length > 15 
          ? item.courses.course_title.substring(0, 15) + '...' 
          : item.courses?.course_title || 'Unknown Course',
        progress: item.actualProgress || 0,
        interactions: item.interactions || 0
      }));

  const pieData = [
    { name: 'Completed', value: teamStats.completedCourses },
    { name: 'In Progress', value: (teamStats.totalCourses || performanceData.length) - teamStats.completedCourses }
  ];

  const COLORS = ['#16a34a', '#fbbf24'];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading performance data...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Performance Reports</h2>
        <p className="text-gray-600 mt-2">
          {user.role === 'Admin' ? 'Team performance overview and analytics' : 'Your learning progress and achievements'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {user.role === 'Admin' ? 'Active Members' : 'Courses Enrolled'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {user.role === 'Admin' ? teamStats.totalMembers : teamStats.totalCourses}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Progress</p>
              <p className="text-2xl font-semibold text-gray-900">{teamStats.avgProgress}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Interactions</p>
              <p className="text-2xl font-semibold text-gray-900">{teamStats.totalInteractions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{teamStats.completedCourses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Progress Chart */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {user.role === 'Admin' ? 'Course Progress Overview' : 'Your Course Progress'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="progress" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Chart */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Data Table/Groups */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {user.role === 'Admin' ? 'Team Performance by Course' : 'Your Course Activity'}
          </h3>
        </div>
        
        {user.role === 'Admin' ? (
          // Admin view: Grouped by course with expandable sections
          <div className="divide-y divide-gray-200">
            {courseGroups.map((courseGroup) => (
              <div key={courseGroup.courseId}>
                {/* Course Header */}
                <div 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleCourseExpansion(courseGroup.courseId)}
                >
                  <div className="flex items-center space-x-3">
                    {expandedCourses.has(courseGroup.courseId) ? 
                      <ChevronDown className="h-5 w-5 text-gray-400" /> : 
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    }
                    <div>
                      <h4 className="text-md font-semibold text-gray-900">{courseGroup.courseTitle}</h4>
                      <p className="text-sm text-gray-500">
                        {courseGroup.totalMembers} members • {courseGroup.avgProgress}% avg progress • {courseGroup.completed} completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${courseGroup.avgProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12">{courseGroup.avgProgress}%</span>
                  </div>
                </div>
                
                {/* Expanded Course Members */}
                {expandedCourses.has(courseGroup.courseId) && (
                  <div className="bg-gray-50">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team Member
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Progress
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Interactions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Activity
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {courseGroup.members.map((member, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {member.userName?.charAt(0) || 'U'}
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">
                                      {member.userName}
                                    </div>
                                    {member.userTeam && (
                                      <div className="text-xs text-gray-500">{member.userTeam}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full" 
                                      style={{ width: `${member.actualProgress || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-gray-600">{member.actualProgress || 0}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {member.interactions}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  member.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  member.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {member.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(member.updated_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Standard user view: Simple table of their courses
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performanceData.slice(0, 10).map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.courses?.course_title || 'Unknown Course'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${item.actualProgress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{item.actualProgress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.interactions || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceReports;
