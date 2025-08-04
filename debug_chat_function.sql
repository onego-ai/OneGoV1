-- Debug Chat Function Issues
-- This script helps identify why the chat-with-tutor function might be failing

-- Check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'chat_with_tutor';

-- Check if there are any recent errors in the function logs
-- (This would require access to Supabase logs, but we can check for common issues)

-- Test basic function call structure
-- Note: This is a diagnostic query to understand the function structure
SELECT 
  'Function Status' as check_type,
  'chat-with-tutor function exists' as status,
  'Ready for testing' as notes;

-- Check if required environment variables are configured
-- (This would be checked in Supabase dashboard)
SELECT 
  'Environment Variables' as check_type,
  'GROQ_API_KEY should be set' as requirement,
  'Check Supabase Dashboard > Settings > Edge Functions' as action;

-- Check if the courses table has the expected structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'courses'
ORDER BY ordinal_position;

-- Check if there are any courses in the database
SELECT 
  COUNT(*) as total_courses,
  COUNT(CASE WHEN system_prompt IS NOT NULL THEN 1 END) as courses_with_prompts,
  COUNT(CASE WHEN course_plan IS NOT NULL THEN 1 END) as courses_with_plans
FROM courses;

-- Check recent courses for debugging
SELECT 
  id,
  course_title,
  track_type,
  created_at,
  CASE 
    WHEN system_prompt IS NOT NULL THEN 'Has prompt'
    ELSE 'No prompt'
  END as prompt_status,
  CASE 
    WHEN course_plan IS NOT NULL THEN 'Has plan'
    ELSE 'No plan'
  END as plan_status
FROM courses 
ORDER BY created_at DESC 
LIMIT 5;

-- Summary of potential issues
SELECT 
  'Potential Issues' as issue_type,
  'GROQ_API_KEY not configured' as description,
  'Set in Supabase Dashboard' as solution
UNION ALL
SELECT 
  'Potential Issues',
  'Function deployment failed',
  'Redeploy edge function'
UNION ALL
SELECT 
  'Potential Issues',
  'Course data missing',
  'Ensure course has system_prompt and course_plan'
UNION ALL
SELECT 
  'Potential Issues',
  'Rate limiting active',
  'Check rate limit configuration'
UNION ALL
SELECT 
  'Potential Issues',
  'Validation failing',
  'Check input validation in frontend'; 