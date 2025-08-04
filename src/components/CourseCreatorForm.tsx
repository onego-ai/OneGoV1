
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, Users, Target, Zap, CheckCircle } from 'lucide-react';

interface CourseCreatorFormProps {
  userId: string;
  onCourseCreated: () => void;
}

const CourseCreatorForm: React.FC<CourseCreatorFormProps> = ({ userId, onCourseCreated }) => {
  const [formData, setFormData] = useState({
    courseTitle: '',
    trackType: 'Corporate',
    duration: '30',
    difficulty: 'Intermediate',
    objectives: '',
    topics: '',
    specialInstructions: ''
  });
  const [loading, setLoading] = useState(false);
  const [canCreateCourse, setCanCreateCourse] = useState(true);
  const [coursesCreatedToday, setCoursesCreatedToday] = useState(0);
  const { toast } = useToast();

  React.useEffect(() => {
    checkDailyLimit();
  }, [userId]);

  const checkDailyLimit = async () => {
    try {
      // Check user's plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single();

      if (profile?.plan === 'Free') {
        // Check course usage for today
        const { data: usage } = await supabase
          .from('course_usage')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (usage) {
          const today = new Date().toDateString();
          const lastCourseDate = new Date(usage.last_course_date).toDateString();
          
          if (today === lastCourseDate) {
            setCoursesCreatedToday(usage.courses_created_today);
            setCanCreateCourse(usage.courses_created_today < 1);
          } else {
            setCoursesCreatedToday(0);
            setCanCreateCourse(true);
          }
        } else {
          setCoursesCreatedToday(0);
          setCanCreateCourse(true);
        }
      } else {
        setCanCreateCourse(true);
      }
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  };

  const updateDailyUsage = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: usage } = await supabase
        .from('course_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (usage) {
        const usageDate = new Date(usage.last_course_date).toISOString().split('T')[0];
        
        if (today === usageDate) {
          // Same day, increment count
          await supabase
            .from('course_usage')
            .update({
              courses_created_today: usage.courses_created_today + 1,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        } else {
          // New day, reset count
          await supabase
            .from('course_usage')
            .update({
              courses_created_today: 1,
              last_course_date: today,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        }
      } else {
        // Create new usage record
        await supabase
          .from('course_usage')
          .insert({
            user_id: userId,
            courses_created_today: 1,
            last_course_date: today
          });
      }
    } catch (error) {
      console.error('Error updating daily usage:', error);
    }
  };

  const generateSystemPrompt = () => {
    return `You are an expert AI tutor specializing in ${formData.trackType.toLowerCase()} training. 

Course Details:
- Title: ${formData.courseTitle}
- Track: ${formData.trackType}
- Duration: ${formData.duration} minutes
- Difficulty: ${formData.difficulty}
- Learning Objectives: ${formData.objectives}
- Key Topics: ${formData.topics}
- Special Instructions: ${formData.specialInstructions}

Your role is to guide learners through this course content in an engaging, interactive way. Always:
1. Adapt to the learner's pace and understanding level
2. Provide practical examples and scenarios
3. Ask questions to check understanding
4. Encourage active participation
5. Provide constructive feedback

Keep sessions focused and within the specified duration. Make learning enjoyable and memorable.`;
  };

  const generateCoursePlan = () => {
    const objectives = formData.objectives.split('\n').filter(obj => obj.trim());
    const topics = formData.topics.split('\n').filter(topic => topic.trim());
    
    return {
      title: formData.courseTitle,
      duration: parseInt(formData.duration),
      difficulty: formData.difficulty,
      objectives: objectives,
      modules: topics.map((topic, index) => ({
        id: index + 1,
        title: topic.trim(),
        duration: Math.floor(parseInt(formData.duration) / topics.length),
        content: `Interactive session covering ${topic.trim()}`
      })),
      trackType: formData.trackType
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateCourse) {
      toast({
        title: "Daily Limit Reached",
        description: "Free plan users can create 1 course per day. Upgrade to Pro for unlimited courses.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const coursePlan = generateCoursePlan();
      const systemPrompt = generateSystemPrompt();

      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            creator_id: userId,
            course_title: formData.courseTitle,
            course_plan: coursePlan,
            system_prompt: systemPrompt,
            track_type: formData.trackType,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update daily usage for Free plan users
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single();

      if (profile?.plan === 'Free') {
        await updateDailyUsage();
      }

      toast({
        title: "Course Created Successfully!",
        description: `"${formData.courseTitle}" has been created and is ready for use.`,
      });

      // Reset form
      setFormData({
        courseTitle: '',
        trackType: 'Corporate',
        duration: '30',
        difficulty: 'Intermediate',
        objectives: '',
        topics: '',
        specialInstructions: ''
      });

      // Redirect to courses view
      onCourseCreated();
      
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {!canCreateCourse && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-yellow-800 font-medium">Daily Limit Reached</p>
              <p className="text-yellow-700 text-sm">
                You've created {coursesCreatedToday}/1 courses today. Free plan users can create 1 course per day.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Course Title */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <BookOpen className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">Course Details</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                value={formData.courseTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, courseTitle: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Advanced Leadership Skills"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Track Type *
              </label>
              <select
                value={formData.trackType}
                onChange={(e) => setFormData(prev => ({ ...prev, trackType: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Corporate">Corporate Training</option>
                <option value="Educational">Educational</option>
              </select>
            </div>
          </div>
        </div>

        {/* Course Settings */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Course Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Learning Content */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="h-6 w-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Learning Content</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learning Objectives *
              </label>
              <textarea
                value={formData.objectives}
                onChange={(e) => setFormData(prev => ({ ...prev, objectives: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={4}
                placeholder="Enter each objective on a new line:&#10;• Understand key leadership principles&#10;• Develop communication skills&#10;• Practice decision-making scenarios"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Topics to Cover *
              </label>
              <textarea
                value={formData.topics}
                onChange={(e) => setFormData(prev => ({ ...prev, topics: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={4}
                placeholder="Enter each topic on a new line:&#10;Communication Strategies&#10;Team Building&#10;Conflict Resolution&#10;Performance Management"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={formData.specialInstructions}
                onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Any specific requirements, teaching methods, or focus areas..."
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !canCreateCourse}
            className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-colors ${
              loading || !canCreateCourse
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating Course...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Create Course</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseCreatorForm;
