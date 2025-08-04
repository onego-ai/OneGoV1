-- Test Complete Credit Tracking System
-- This script tests the entire credit tracking system from end to end

-- 1. Check current state before testing
SELECT '=== CURRENT STATE BEFORE TESTING ===' as status;

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

-- 2. Check current credit usage log
SELECT '=== CURRENT CREDIT USAGE LOG ===' as status;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Test manual credit consumption
SELECT '=== TESTING MANUAL CREDIT CONSUMPTION ===' as status;

SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'test_manual',
  'Manual test credit consumption'
);

-- 4. Check state after manual consumption
SELECT '=== STATE AFTER MANUAL CONSUMPTION ===' as status;

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

-- 5. Test course creation trigger by inserting a test course
SELECT '=== TESTING COURSE CREATION TRIGGER ===' as status;

INSERT INTO courses (
  creator_id,
  course_title,
  course_plan,
  system_prompt,
  track_type
) VALUES (
  '23401d96-3247-40b7-8997-12cdf5301a76',
  'Test Course - Credit Tracking Test',
  '{"test": "data", "modules": []}'::jsonb,
  'Test system prompt for credit tracking',
  'Educational'
) RETURNING id, course_title, creator_id, created_at;

-- 6. Check state after course creation
SELECT '=== STATE AFTER COURSE CREATION ===' as status;

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

-- 7. Check updated credit usage log
SELECT '=== UPDATED CREDIT USAGE LOG ===' as status;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC
LIMIT 10;

-- 8. Test the get_user_credit_summary function
SELECT '=== TESTING get_user_credit_summary FUNCTION ===' as status;

SELECT * FROM public.get_user_credit_summary('23401d96-3247-40b7-8997-12cdf5301a76');

-- 9. Check recent courses
SELECT '=== RECENT COURSES ===' as status;

SELECT 
  id,
  course_title,
  creator_id,
  created_at
FROM courses 
WHERE creator_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC
LIMIT 5;

-- 10. Summary
SELECT '=== TEST SUMMARY ===' as status;

SELECT 
  'Total credits used this month' as metric,
  cl.credits_used_this_month::text as value
FROM credit_limits cl
WHERE cl.user_id = '23401d96-3247-40b7-8997-12cdf5301a76'

UNION ALL

SELECT 
  'Available credits' as metric,
  (cl.monthly_credits + cl.additional_credits_purchased - cl.credits_used_this_month)::text as value
FROM credit_limits cl
WHERE cl.user_id = '23401d96-3247-40b7-8997-12cdf5301a76'

UNION ALL

SELECT 
  'Total credit usage entries' as metric,
  COUNT(*)::text as value
FROM credit_usage 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76'

UNION ALL

SELECT 
  'Total courses created' as metric,
  COUNT(*)::text as value
FROM courses 
WHERE creator_id = '23401d96-3247-40b7-8997-12cdf5301a76';

SELECT '=== CREDIT TRACKING SYSTEM TEST COMPLETE ===' as status; 