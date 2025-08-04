
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

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

  try {
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
    } = await req.json();

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    // Build course modules context if available
    const courseModulesContext = coursePlan?.modules && Array.isArray(coursePlan.modules) && coursePlan.modules.length > 0
      ? `\nCOURSE STRUCTURE:\n${coursePlan.modules.map((module: any, index: number) => 
          `${index + 1}. ${module.title} (${module.duration} min)\n   ${module.content}\n   Key Points: ${module.keyPoints?.join(', ') || 'N/A'}`
        ).join('\n\n')}`
      : '';

    // Enhanced system prompt with word limit and formatting instructions
    const enhancedSystemPrompt = `${systemPrompt}

CRITICAL RESPONSE GUIDELINES:
- Keep ALL responses between 40-100 words maximum
- Be concise, engaging, and focused
- Ask one clear question at a time
- Use simple, conversational language
- Stay on topic and avoid lengthy explanations
- Follow the course structure and guide learners through the modules systematically

FORMATTING REQUIREMENTS:
- Use **bold** formatting for the most impactful and important words
- Bold key concepts, important terms, action words, and emphasis points
- Examples: **essential**, **important**, **key point**, **remember**, **critical**, **focus**, **success**
- Make your messages visually engaging and easy to scan

SPECIFIC CONTENT REQUIREMENTS:
- Every response MUST directly relate to: ${coursePlan?.courseDescription || 'the course topic'}
- Provide examples and scenarios specific to: ${coursePlan?.courseDescription || 'the course topic'}
- Address the needs of: ${coursePlan?.learnerDescription || 'the target learners'}
- Reference specific modules and concepts from the course structure
- Use terminology and examples relevant to: ${coursePlan?.courseDescription || 'the course topic'}

COURSE CONTEXT:
- Track: ${trackType}
- Company: ${companyName || 'General'}
- Course Description: ${coursePlan?.courseDescription || 'Not specified'}
- Target Learners: ${coursePlan?.learnerDescription || 'Not specified'}
- Goal: ${coursePlan?.goal || 'Learning objectives'}
- Duration: ${coursePlan?.duration || coursePlan?.modules?.reduce((total: number, module: any) => total + (module.duration || 0), 0) || 30} minutes

${courseModulesContext}

${companyData ? `COMPANY CONTEXT: ${JSON.stringify(companyData).substring(0, 500)}` : ''}

Remember: MAXIMUM 40-100 words per response. Be engaging, concise, and use **bold** for impact. EVERY response must be specific to ${coursePlan?.courseDescription || 'the course topic'} and relevant to ${coursePlan?.learnerDescription || 'the target learners'}.`;

    // Prepare messages for Groq
    const messages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...chatHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Sending request to Groq...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: messages,
        max_tokens: 150, // Limit tokens to enforce word count
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    let reply = data.choices[0].message.content;

    // Enhanced speech text replacement for better pronunciation
    const speechReply = reply
      .replace(/ONEGO Learning/gi, 'ONE GO Learning')
      .replace(/ONEGO/gi, 'ONE GO')
      .replace(/Onego Learning/gi, 'ONE GO Learning')
      .replace(/Onego/gi, 'ONE GO');

    console.log('Generated reply:', reply);
    console.log('Speech reply:', speechReply);

    return new Response(
      JSON.stringify({ 
        reply: reply, // Original text for display
        speechReply: speechReply // Modified text for speech
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-with-tutor function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
