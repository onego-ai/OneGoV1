
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        groqApiKeyConfigured: !!groqApiKey,
        groqApiKeyLength: groqApiKey ? groqApiKey.length : 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Chat function called');
    
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      message, 
      chatHistory, 
      systemPrompt, 
      courseId, 
      userId, 
      userName,
      coursePlan,
      trackType,
      companyName,
      companyData
    } = requestBody;

    // Validate required fields
    if (!message || !courseId || !userId) {
      console.error('Missing required fields:', { message: !!message, courseId: !!courseId, userId: !!userId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message, courseId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Request data received:', {
      message: message?.substring(0, 50) + '...',
      courseId,
      userId,
      trackType,
      companyName,
      chatHistoryLength: chatHistory?.length || 0
    });

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    console.log('GROQ_API_KEY exists:', !!groqApiKey);
    
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'GROQ_API_KEY not configured. Please set it in Supabase Dashboard > Settings > Edge Functions' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test Groq API integration
    try {
      console.log('Testing Groq API integration...');
      
      // Build course context if available
      const courseContext = coursePlan?.courseDescription 
        ? `Course: ${coursePlan.courseDescription}. ` 
        : '';
      
      const learnerContext = coursePlan?.learnerDescription 
        ? `Target learners: ${coursePlan.learnerDescription}. ` 
        : '';
      
      const systemPrompt = `You are an expert tutor from ONEGO Learning. ${courseContext}${learnerContext}Keep responses between 40-100 words. Be engaging and use **bold** for key points. Stay focused on the course topic.`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...(chatHistory || []).map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ];
      
      console.log('System prompt:', systemPrompt);
      console.log('Messages count:', messages.length);
      console.log('Making Groq API request...');
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: messages,
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      console.log('Groq response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error:', errorText);
        // Fall back to test response
        return new Response(
          JSON.stringify({ 
            reply: `Test response: I received your message "${message}" for course ${courseId}. This is a test response to verify the function is working.`,
            speechReply: `Test response: I received your message "${message}" for course ${courseId}. This is a test response to verify the function is working.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('Groq response received successfully');
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const reply = data.choices[0].message.content;
        console.log('AI reply generated:', reply);
        
        // Enhanced speech text replacement for better pronunciation
        const speechReply = reply
          .replace(/ONEGO Learning/gi, 'ONE GO Learning')
          .replace(/ONEGO/gi, 'ONE GO')
          .replace(/Onego Learning/gi, 'ONE GO Learning')
          .replace(/Onego/gi, 'ONE GO');
        
        return new Response(
          JSON.stringify({ 
            reply: reply,
            speechReply: speechReply
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error('Invalid Groq response format:', data);
        // Fall back to test response
        return new Response(
          JSON.stringify({ 
            reply: `Test response: I received your message "${message}" for course ${courseId}. This is a test response to verify the function is working.`,
            speechReply: `Test response: I received your message "${message}" for course ${courseId}. This is a test response to verify the function is working.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
    } catch (groqError) {
      console.error('Groq API integration error:', groqError);
      // Fall back to test response
      return new Response(
        JSON.stringify({ 
          reply: `Test response: I received your message "${message}" for course ${courseId}. This is a test response to verify the function is working.`,
          speechReply: `Test response: I received your message "${message}" for course ${courseId}. This is a test response to verify the function is working.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in chat-with-tutor function:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ error: 'Internal server error - check logs for details' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
