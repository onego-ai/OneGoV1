
import React, { useState, useEffect } from 'react';
import { X, BookOpen, Clock, CheckCircle, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CourseAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  userAssignments: string[];
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  progress: number;
  points: number;
  total_interactions: number;
  session_duration: number;
  completed_at: string | null;
  feedback?: any[];
}

const CourseAssignmentsModal: React.FC<CourseAssignmentsModalProps> = ({
  isOpen,
  onClose,
  person,
  userAssignments
}) => {
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && person) {
      loadCourseProgress();
    }
  }, [isOpen, person]);

  const loadCourseProgress = async () => {
    try {
      // Get user's course assignments
      const { data: assignments } = await supabase
        .from('user_course_assignments')
        .select('course_id')
        .eq('user_id', person.id);

      if (!assignments || assignments.length === 0) {
        setCourseProgress([]);
        setLoading(false);
        return;
      }

      // Get course details separately
      const courseIds = assignments.map(a => a.course_id);
      const { data: courses } = await supabase
        .from('courses')
        .select('id, course_title')
        .in('id', courseIds);

      // Get user performance data
      const { data: performance } = await supabase
        .from('user_performance')
        .select('*')
        .eq('user_id', person.id)
        .in('course_id', courseIds);

      // Get session feedback
      const { data: feedback } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('user_id', person.id)
        .in('course_id', courseIds);

      // Combine the data
      const progressData = assignments.map(assignment => {
        const course = courses?.find(c => c.id === assignment.course_id);
        const perf = performance?.find(p => p.course_id === assignment.course_id);
        const courseFeedback = feedback?.filter(f => f.course_id === assignment.course_id) || [];
        
        return {
          course_id: assignment.course_id,
          course_title: course?.course_title || 'Unknown Course',
          progress: perf?.progress || 0,
          points: perf?.points || 0,
          total_interactions: perf?.total_interactions || 0,
          session_duration: courseFeedback.reduce((sum, f) => sum + (f.session_duration_minutes || 0), 0),
          completed_at: perf?.completed_at,
          feedback: courseFeedback
        };
      });

      setCourseProgress(progressData);
    } catch (error) {
      console.error('Error loading course progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'text-green-600';
    if (progress > 50) return 'text-blue-600';
    if (progress > 0) return 'text-yellow-600';
    return 'text-gray-400';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress > 50) return 'bg-blue-500';
    if (progress > 0) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Course Assignments - {person.full_name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading course progress...</div>
          </div>
        ) : courseProgress.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No courses assigned yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courseProgress.map((course) => (
              <div key={course.course_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-lg">{course.course_title}</h3>
                  <div className="flex items-center space-x-2">
                    {course.progress === 100 && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <span className={`font-semibold ${getProgressColor(course.progress)}`}>
                      {course.progress}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressBgColor(course.progress)}`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">
                      {course.points} points earned
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">
                      {course.total_interactions} interactions
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">
                      {course.session_duration} minutes studied
                    </span>
                  </div>
                </div>

                {/* Completion Status */}
                {course.completed_at && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      ✅ Completed on {new Date(course.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Session Feedback */}
                {course.feedback && course.feedback.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Session Feedback:</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {course.feedback.map((fb, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">
                              Session {index + 1}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(fb.session_date).toLocaleDateString()}
                            </span>
                          </div>
                          {fb.ai_feedback && (
                            <p className="text-gray-700 mb-2">{fb.ai_feedback}</p>
                          )}
                          <div className="flex space-x-4 text-xs text-gray-600">
                            {fb.usefulness_rating && (
                              <span>Usefulness: {fb.usefulness_rating}/5</span>
                            )}
                            {fb.challenge_rating && (
                              <span>Challenge: {fb.challenge_rating}/5</span>
                            )}
                            {fb.session_duration_minutes && (
                              <span>Duration: {fb.session_duration_minutes}min</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseAssignmentsModal;
