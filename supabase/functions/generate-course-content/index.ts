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

  try {
    const { prompt, moduleType, courseSubject, trackType, moduleNumber, totalModules, moduleTitle, moduleTitles } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a detailed prompt for the AI
    const detailedPrompt = `Create comprehensive, unique course content for a ${moduleType} module titled "${moduleTitle}" about "${courseSubject}" for ${trackType} learners. This is module ${moduleNumber} of ${totalModules}.

Strict requirements:
- Depth: For each sub-topic include: what problem it solves, core principles, when to use it vs alternatives, and a real-world scenario. Avoid superficial descriptions.
- Scope control: Focus only on the most important advanced concepts for this module; do not try to cover everything. Prefer depth over breadth.
- Progression: Provide an internal learning path (step-by-step sequence) inside the module topics.
- Prerequisites: Explicitly list assumed prerequisites for this module.
- Capstone: Include one evolving capstone project that integrates the module topics with milestones.
- Advanced examples: Replace simple beginner examples (e.g., todo apps) with complex scenarios aligned to the topic. For web: auth flows, real-time data, complex routing, SSR/SSG, performance budgets, etc.
- Non-generic: Use topic-specific, opinionated guidance, trade-offs, and "why/when" discussions.
- Consolidation: Avoid redundancy across sections. Use "What learners will learn" as high-level bullets; keep details in "Detailed topics". Tools should be referenced inline where used; avoid a standalone tools list.
- Challenges: Include nuanced challenges and actionable solutions with code-level or architecture-level advice.
- Format: Plain text only (no markdown like ** or #). Use clear headings and bullet points. Do not include labeled subheadings like “Purpose:”, “When to use:”, or “Trade-offs:”—explain these within paragraphs where relevant.
- Uniqueness: Content must differ across modules ${moduleNumber}/${totalModules}. Reference the module title and ensure focus aligns with it. If provided, use this list of all module titles to avoid overlap: ${Array.isArray(moduleTitles) ? moduleTitles.join('; ') : ''}.

If Module Type equals "course-outline", strictly produce this course outline instead (plain text, no markdown):
1. Course Identification & Overview
- Course Title: a clear, concise, descriptive name aligned to ${courseSubject}
- Course Description/Synopsis: brief summary, scope, and what learners will gain
- Target Audience/Prerequisites: assumed knowledge and who it's for
- Instructor/Author Information (optional): brief creator bio
2. Learning Objectives/Outcomes
- Overall Course Objectives: measurable, Bloom's verbs
- Module/Unit Objectives: per-module objectives (brief bullets for each planned module)
3. Course Content (The "What")
- Logical Progression: modules/units from foundational to advanced
- Key Concepts/Theories: essential frameworks
- Practical Skills/Techniques: methods learners will master
- Examples & Illustrations: concrete examples/case studies
4. Learning Activities (The "How")
- Instructional Methods: lectures, readings, demos, discussions
- Guided Practice: quizzes, guided exercises
- Independent Practice: homework, projects
- Collaborative Activities: group work, peer review (optional)
5. Assessment & Evaluation
- Formative Assessments: low-stakes checks
- Summative Assessments: exams/projects/capstone
- Grading Criteria/Rubrics: how success is measured
- Feedback Mechanisms: how feedback is provided
Ensure the outline is specific to "${courseSubject}" and suitable for ${trackType} learners.

Context
- Module Type: ${moduleType}
- Module Title: ${moduleTitle}
- Course Subject: ${courseSubject}
- Track Type: ${trackType}
- Position: Module ${moduleNumber} of ${totalModules}

Deliverable structure (for non-outline modules)
1) Overview (2-3 paragraphs)
2) Prerequisites (bulleted)
3) What learners will learn (5-7 bullets; high level, no repetition; avoid “you will learn” phrasing—state the skills/knowledge directly)
4) Learning path (stepwise sequence 1..n explaining how topics build)
5) Detailed topics (3-5 topics). For each topic write 2–4 short paragraphs that explain the concept in depth and walk through one realistic example or mini case; embed any comparisons or trade-offs naturally within the narrative; do not use labeled subsections.
6) Capstone project (describe the scenario, data, milestones, and evaluation criteria)
7) Common challenges and solutions (specific, advanced issues with remedies)
8) Success metrics and evaluation (measurable outcomes, performance targets)
9) Further resources (high-quality references)

Ensure all content is specific to "${moduleTitle}" in the context of "${courseSubject}" and does not revert to generic descriptions.`;

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: `You are an expert course content creator specializing in creating unique, topic-specific educational content. Your content should be:
            - Highly relevant and specific to the given topic/subject
            - Include real examples, case studies, and practical applications
            - Provide actionable learning with specific frameworks, tools, and methodologies
            - Use professional but accessible language
            - Include specific industry examples and best practices
            - Avoid generic content - make it unique to the topic
            - Provide concrete steps, tools, and techniques
            - Include relevant terminology and concepts specific to the field
            
            Format the content with clear sections, bullet points, and structured information. Make it comprehensive and valuable for learners.`
          },
          {
            role: 'user',
            content: detailedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        top_p: 1,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const data = await groqResponse.json();
    const generatedContent = data.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from Groq API');
    }

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating content:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate content', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 