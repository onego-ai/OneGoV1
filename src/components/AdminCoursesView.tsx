import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Play, Send, Users, Loader2, CheckCircle, Clock, FileText, Globe, Trash2, Edit3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import TeamAssignmentModal from './courses/TeamAssignmentModal';

interface AdminCoursesViewProps {
  user: any;
  onStartSession: (course: any) => void;
  onEditCourse?: (course: any) => void;
}

interface CourseWithAssignments {
  id: string;
  course_title: string;
  track_type: string;
  status: string;
  created_at: string;
  course_plan: any;
  system_prompt: string;
  creator_id: string;
  assigned_teams: string[];
}

const AdminCoursesView: React.FC<AdminCoursesViewProps> = ({ user, onStartSession, onEditCourse }) => {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingCourse, setPublishingCourse] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null);
  const [teamAssignmentModal, setTeamAssignmentModal] = useState<{
    isOpen: boolean;
    course: any | null;
  }>({ isOpen: false, course: null });
  const { toast } = useToast();

  useEffect(() => {
    loadCourses();
    loadTeamMembers();
  }, [user]);

  const loadCourses = async () => {
    try {
      // Fetch courses with their assignments
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Fetch assignments for all courses
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('individual_course_assignments')
        .select('course_id, assigned_to_team')
        .in('course_id', coursesData?.map(c => c.id) || []);

      if (assignmentsError) throw assignmentsError;

      // Group assignments by course_id and extract unique teams
      const assignmentsByTourse = assignmentsData?.reduce((acc, assignment) => {
        if (!acc[assignment.course_id]) {
          acc[assignment.course_id] = new Set();
        }
        if (assignment.assigned_to_team) {
          // Handle comma-separated teams
          const teams = assignment.assigned_to_team.split(', ');
          teams.forEach(team => acc[assignment.course_id].add(team.trim()));
        }
        return acc;
      }, {} as Record<string, Set<string>>) || {};

      // Combine courses with their assigned teams
      const coursesWithAssignments = coursesData?.map(course => ({
        ...course,
        assigned_teams: Array.from(assignmentsByTourse[course.id] || [])
      })) || [];

      setCourses(coursesWithAssignments);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data: peopleData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('group_id', user.group_id)
        .order('full_name');

      if (error) throw error;
      setPeople(peopleData || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const deleteCourse = async (courseId: string) => {
    setDeletingCourse(courseId);
    try {
      console.log('Starting deletion of course:', courseId);
      
      // First, verify that the user is the course creator
      const { data: courseData, error: courseCheckError } = await supabase
        .from('courses')
        .select('creator_id')
        .eq('id', courseId)
        .single();

      if (courseCheckError) {
        console.error('Error checking course ownership:', courseCheckError);
        throw courseCheckError;
      }

      if (courseData.creator_id !== user.id) {
        throw new Error('You can only delete courses that you created.');
      }

      console.log('Course ownership verified, proceeding with deletion...');
      
      // Delete related records first
      console.log('Deleting course assignments...');
      const { error: assignmentsError } = await supabase
        .from('course_assignments')
        .delete()
        .eq('course_id', courseId);

      if (assignmentsError) {
        console.error('Error deleting course assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Deleting user course assignments...');
      const { error: userAssignmentsError } = await supabase
        .from('user_course_assignments')
        .delete()
        .eq('course_id', courseId);

      if (userAssignmentsError) {
        console.error('Error deleting user course assignments:', userAssignmentsError);
        // Don't throw error, just log it - the table might not exist
        console.log('Continuing with deletion process...');
      }

      // Delete individual course assignments
      console.log('Deleting individual course assignments...');
      const { error: individualAssignmentsError } = await supabase
        .from('individual_course_assignments')
        .delete()
        .eq('course_id', courseId);

      if (individualAssignmentsError) {
        console.error('Error deleting individual course assignments:', individualAssignmentsError);
        console.log('Continuing with deletion process...');
      }

      console.log('Deleting user performance records...');
      const { error: performanceError } = await supabase
        .from('user_performance')
        .delete()
        .eq('course_id', courseId);

      if (performanceError) {
        console.error('Error deleting user performance:', performanceError);
        console.log('Continuing with deletion process...');
      }

      console.log('Deleting session feedback...');
      const { error: feedbackError } = await supabase
        .from('session_feedback')
        .delete()
        .eq('course_id', courseId);

      if (feedbackError) {
        console.error('Error deleting session feedback:', feedbackError);
        console.log('Continuing with deletion process...');
      }

      // Finally delete the course
      console.log('Deleting course...');
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (courseError) {
        console.error('Error deleting course:', courseError);
        throw courseError;
      }

      console.log('Course deleted successfully');
      toast({
        title: "Success",
        description: "Course deleted successfully.",
      });
      
      loadCourses();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        title: "Error",
        description: error.message || "Failed to delete course.",
        variant: "destructive",
      });
    } finally {
      setDeletingCourse(null);
    }
  };

  const publishCourse = async (courseId: string) => {
    setPublishingCourse(courseId);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'published' })
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course published successfully! You can now assign it to team members.",
      });
      
      loadCourses();
    } catch (error: any) {
      console.error('Error publishing course:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to publish course.",
        variant: "destructive",
      });
    } finally {
      setPublishingCourse(null);
    }
  };

  const handleAssignCourse = (course: any) => {
    setTeamAssignmentModal({ isOpen: true, course });
  };

  const closeTeamAssignmentModal = () => {
    setTeamAssignmentModal({ isOpen: false, course: null });
    // Reload courses to update assignment display
    loadCourses();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <Globe className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Published';
      case 'processing':
        return 'Processing...';
      default:
        return 'Draft';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const draftedCourses = courses.filter(course => course.status === 'drafted' || course.status === 'processing');
  const publishedCourses = courses.filter(course => course.status === 'published');

  const CourseCard = ({ course, isDraft = false }: { course: CourseWithAssignments; isDraft?: boolean }) => (
    <div className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon(course.status)}
          <span className="text-sm font-medium text-gray-600">
            {getStatusText(course.status)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {course.track_type}
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={deletingCourse === course.id}
                className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingCourse === course.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Course</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{course.course_title}"? This action cannot be undone and will permanently remove the course and all associated data including assignments, performance records, and feedback.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteCourse(course.id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete Course
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {course.course_title}
      </h3>

      {/* Display assigned teams for published courses */}
      {!isDraft && course.assigned_teams.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Assigned to:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {course.assigned_teams.map((team, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {team}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Show "Not assigned" for published courses with no assignments */}
      {!isDraft && course.assigned_teams.length === 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Not assigned to any teams</span>
          </div>
        </div>
      )}
      
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
        A comprehensive learning experience designed to enhance skills and knowledge.
      </p>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => onStartSession(course)}
            disabled={course.status === 'processing'}
            className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            <Play className="h-4 w-4" />
            <span>Test</span>
          </button>

          {onEditCourse && (
            <button
              onClick={() => onEditCourse(course)}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit</span>
            </button>
          )}

          {isDraft ? (
            <button
              onClick={() => publishCourse(course.id)}
              disabled={publishingCourse === course.id || course.status === 'processing'}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
            >
              {publishingCourse === course.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span>Publish</span>
            </button>
          ) : (
            <button
              onClick={() => handleAssignCourse(course)}
              className="flex items-center space-x-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
            >
              <Send className="h-4 w-4" />
              <span>Assign</span>
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400">
          {new Date(course.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
          <p className="text-gray-600">Manage your courses through their lifecycle</p>
        </div>

        <Tabs defaultValue="drafted" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="drafted" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Draft Courses ({draftedCourses.length})</span>
            </TabsTrigger>
            <TabsTrigger value="published" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Published Courses ({publishedCourses.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drafted">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Draft Courses</h2>
              <p className="text-gray-600 text-sm">Test and refine your courses before publishing them to your team.</p>
            </div>
            
            {draftedCourses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No draft courses</h3>
                <p className="text-gray-500">Create your first course using the Course Creator.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {draftedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} isDraft={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="published">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Published Courses</h2>
              <p className="text-gray-600 text-sm">Assign these courses to your team members and track their progress.</p>
            </div>
            
            {publishedCourses.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No published courses</h3>
                <p className="text-gray-500">Publish your draft courses to make them available for assignment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} isDraft={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TeamAssignmentModal
        isOpen={teamAssignmentModal.isOpen}
        onClose={closeTeamAssignmentModal}
        course={teamAssignmentModal.course}
        user={user}
        people={people}
      />
    </>
  );
};

export default AdminCoursesView;
