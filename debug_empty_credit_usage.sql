-- Debug Empty Credit Usage Table
-- This script investigates why the credit_usage table is empty

-- 1. Check if credit_usage table exists and has data
SELECT '=== CHECKING CREDIT_USAGE TABLE ===' as status;

SELECT COUNT(*) as total_credit_usage_entries FROM credit_usage;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if the trigger exists
SELECT '=== CHECKING TRIGGER ===' as status;

SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'courses';

-- 3. Check if the consume_credits function exists
SELECT '=== CHECKING CONSUME_CREDITS FUNCTION ===' as status;

SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'consume_credits';

-- 4. Check if the handle_course_creation_credits function exists
SELECT '=== CHECKING HANDLE_COURSE_CREATION_CREDITS FUNCTION ===' as status;

SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'handle_course_creation_credits';

-- 5. Test manual credit consumption to see if it works
SELECT '=== TESTING MANUAL CREDIT CONSUMPTION ===' as status;

SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'debug_test',
  'Debug test to check if function works'
);

-- 6. Check if credit_usage table got updated
SELECT '=== CHECKING CREDIT_USAGE AFTER MANUAL TEST ===' as status;

SELECT COUNT(*) as total_credit_usage_entries FROM credit_usage;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check credit_limits table
SELECT '=== CHECKING CREDIT_LIMITS TABLE ===' as status;

SELECT 
  p.id,
  p.plan as profile_plan,
  cl.plan_type as credit_plan_type,
  cl.monthly_credits,
  cl.credits_used_this_month,
  cl.additional_credits_purchased,
  (cl.monthly_credits + cl.additional_credits_purchased - cl.credits_used_this_month) as available_credits
FROM profiles p
LEFT JOIN credit_limits cl ON p.id = cl.user_id
WHERE p.id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- 8. Check if there are any recent courses
SELECT '=== CHECKING RECENT COURSES ===' as status;

SELECT 
  id,
  course_title,
  creator_id,
  created_at
FROM courses 
WHERE creator_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC
LIMIT 5;

-- 9. Test creating a course to see if trigger fires
SELECT '=== TESTING COURSE CREATION TRIGGER ===' as status;

INSERT INTO courses (
  creator_id,
  course_title,
  course_plan,
  system_prompt,
  track_type
) VALUES (
  '23401d96-3247-40b7-8997-12cdf5301a76',
  'Debug Test Course - Trigger Test',
  '{"debug": "test", "modules": []}'::jsonb,
  'Debug test system prompt',
  'Educational'
) RETURNING id, course_title, creator_id, created_at;

-- 10. Check credit_usage after course creation
SELECT '=== CHECKING CREDIT_USAGE AFTER COURSE CREATION ===' as status;

SELECT COUNT(*) as total_credit_usage_entries FROM credit_usage;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
ORDER BY created_at DESC
LIMIT 5;

SELECT '=== DEBUG COMPLETE ===' as status; 