// Test Chat Comparison
// This script helps compare the working CourseReader request with TutoringSession request

import { supabase } from '@/integrations/supabase/client';

export const testCourseReaderRequest = async (course: any, user: any) => {
  try {
    console.log('Testing CourseReader request (should work)...');
    
    const systemPrompt = `You are an expert course content creator. Create a comprehensive, readable course structure for:

Course: ${course.course_title}
Track: ${course.track_type}
Goal: ${course.course_plan?.goal || course.course_plan?.objective}
Industry: ${course.course_plan?.industry}
Duration: ${course.course_plan?.duration || '30'} minutes

Create 3-5 sections with:
1. Clear, engaging titles
2. Detailed content (200-400 words per section)
3. 3-5 key points per section
4. Estimated reading time (2-5 minutes per section)

Format as JSON with sections array containing: id, title, content, keyPoints, duration, isCompleted.`;

    const response = await supabase.functions.invoke('chat-with-tutor', {
      body: {
        message: "Generate course content structure",
        chatHistory: [],
        systemPrompt: systemPrompt,
        courseId: course.id,
        userId: user.id,
        userName: user.full_name,
        coursePlan: course.course_plan,
        trackType: course.track_type,
        companyName: 'General',
        companyData: null
      }
    });

    console.log('CourseReader test response:', response);
    return response;
  } catch (error) {
    console.error('CourseReader test error:', error);
    return { error };
  }
};

export const testTutoringSessionRequest = async (course: any, user: any, messages: any[]) => {
  try {
    console.log('Testing TutoringSession request...');
    
    const enhancedSystemPrompt = `${course.system_prompt}

COURSE CONTEXT:
- Course: ${course.course_title}
- Company: General
- Course Description: ${course.course_plan?.courseDescription || 'Not specified'}
- Target Learners: ${course.course_plan?.learnerDescription || 'Not specified'}
- Goal: ${course.course_plan?.goal}
- Industry: ${course.course_plan?.industry}
- Delivery: ${course.course_plan?.deliveryStyle?.join(', ')}
- Duration: ${course.course_plan?.duration || 30} minutes`;

    const response = await supabase.functions.invoke('chat-with-tutor', {
      body: {
        message: "Hello, can you help me?",
        chatHistory: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        systemPrompt: enhancedSystemPrompt,
        courseId: course.id,
        userId: user.id,
        userName: user.full_name,
        coursePlan: course.course_plan,
        trackType: course.track_type,
        companyName: 'General',
        companyData: null
      }
    });

    console.log('TutoringSession test response:', response);
    return response;
  } catch (error) {
    console.error('TutoringSession test error:', error);
    return { error };
  }
};

export const compareRequests = async (course: any, user: any) => {
  console.log('=== COMPARING REQUESTS ===');
  
  // Test CourseReader format (should work)
  const courseReaderResult = await testCourseReaderRequest(course, user);
  
  // Test TutoringSession format
  const tutoringSessionResult = await testTutoringSessionRequest(course, user, []);
  
  console.log('=== COMPARISON RESULTS ===');
  console.log('CourseReader success:', !courseReaderResult.error);
  console.log('TutoringSession success:', !tutoringSessionResult.error);
  
  if (courseReaderResult.error) {
    console.log('CourseReader error:', courseReaderResult.error);
  }
  
  if (tutoringSessionResult.error) {
    console.log('TutoringSession error:', tutoringSessionResult.error);
  }
  
  return {
    courseReader: courseReaderResult,
    tutoringSession: tutoringSessionResult
  };
}; 