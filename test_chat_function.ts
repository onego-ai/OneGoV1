// Test Chat Function
// This script helps test if the chat-with-tutor function is working

import { supabase } from '@/integrations/supabase/client';

export const testChatFunction = async () => {
  try {
    console.log('Testing chat-with-tutor function...');
    
    // Test with minimal data
    const testResponse = await supabase.functions.invoke('chat-with-tutor', {
      body: {
        message: "Hello, can you help me?",
        chatHistory: [],
        systemPrompt: "You are a helpful AI tutor.",
        courseId: "test-course-id",
        userId: "test-user-id",
        userName: "Test User",
        coursePlan: {
          courseDescription: "Test course",
          learnerDescription: "Test learners"
        },
        trackType: "Educational",
        companyName: "Test Company",
        companyData: null
      }
    });

    console.log('Test response:', testResponse);
    
    if (testResponse.error) {
      console.error('Function test failed:', testResponse.error);
      return {
        success: false,
        error: testResponse.error.message
      };
    }

    if (testResponse.data?.reply) {
      console.log('Function test successful!');
      return {
        success: true,
        reply: testResponse.data.reply
      };
    } else {
      console.error('No reply received from function');
      return {
        success: false,
        error: 'No reply received'
      };
    }
  } catch (error) {
    console.error('Test function error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Common issues and solutions
export const chatFunctionTroubleshooting = {
  issues: [
    {
      problem: "GROQ_API_KEY not configured",
      solution: "Set GROQ_API_KEY in Supabase Dashboard > Settings > Edge Functions"
    },
    {
      problem: "Function not deployed",
      solution: "Deploy the chat-with-tutor function using: supabase functions deploy chat-with-tutor"
    },
    {
      problem: "Course data missing",
      solution: "Ensure course has system_prompt and course_plan fields"
    },
    {
      problem: "Rate limiting",
      solution: "Check if user has exceeded rate limits"
    },
    {
      problem: "Validation failing",
      solution: "Check input validation in frontend code"
    }
  ]
}; 