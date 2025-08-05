import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface QuizRequest {
  sectionTitle: string;
  sectionContent: string;
  keyPoints: string[];
  numberOfQuestions: number;
  courseTopic: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('Generate Quiz function called');
    
    const { 
      sectionTitle, 
      sectionContent, 
      keyPoints, 
      numberOfQuestions = 3,
      courseTopic 
    }: QuizRequest = await req.json();

    console.log('Quiz generation request received:', {
      sectionTitle,
      contentLength: sectionContent?.length,
      keyPointsCount: keyPoints?.length,
      numberOfQuestions,
      courseTopic
    });

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
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

    // Create a comprehensive prompt for quiz generation
    const quizPrompt = `You are an expert educational content creator. Generate ${numberOfQuestions} meaningful quiz questions based on the following course section content.

COURSE TOPIC: ${courseTopic}
SECTION TITLE: ${sectionTitle}
SECTION CONTENT: ${sectionContent}
KEY POINTS: ${keyPoints?.join(', ') || 'None provided'}

INSTRUCTIONS:
1. Generate exactly ${numberOfQuestions} questions that test understanding of the actual content
2. Each question should be based on specific information from the section content
3. Questions should test: definitions, key concepts, practical applications, or important distinctions
4. Make questions relevant to the course topic and section content
5. Create 4 answer options for each question, with only 1 correct answer
6. Provide a brief explanation for the correct answer

QUESTION TYPES TO INCLUDE:
- Definition questions (e.g., "What is X?" or "Which of the following defines X?")
- Concept understanding questions (e.g., "What is the main purpose of X?" or "How does X work?")
- Application questions (e.g., "How would you apply X in a real situation?" or "What is an example of X?")
- Comparison questions (e.g., "What is the difference between X and Y?" or "Which is NOT a characteristic of X?")

RESPONSE FORMAT (JSON only):
{
  "questions": [
    {
      "question": "What is the definition of [concept]?",
      "options": [
        "Correct answer",
        "Incorrect option 1", 
        "Incorrect option 2",
        "Incorrect option 3"
      ],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No additional text or explanations outside the JSON structure.`;

    console.log('Sending request to Groq for quiz generation...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Generate quiz questions based on provided content. Return only valid JSON.'
          },
          {
            role: 'user',
            content: quizPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    console.log('Groq response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Groq API error: ${response.status} ${errorText}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('Groq response data received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid Groq response format:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from Groq API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const quizResponse = data.choices[0].message.content;
    console.log('Quiz response received:', quizResponse.substring(0, 200) + '...');

    // Parse the JSON response
    let quizData;
    try {
      quizData = JSON.parse(quizResponse);
    } catch (parseError) {
      console.error('Failed to parse quiz response as JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse quiz response as JSON' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate the quiz data structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      console.error('Invalid quiz data structure:', quizData);
      return new Response(
        JSON.stringify({ error: 'Invalid quiz data structure received from AI' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Add IDs to questions
    const questionsWithIds = quizData.questions.map((q: any, index: number) => ({
      ...q,
      id: `ai-generated-${index + 1}`
    }));

    console.log(`Successfully generated ${questionsWithIds.length} quiz questions`);

    return new Response(
      JSON.stringify({ 
        success: true,
        questions: questionsWithIds 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 