-- Verify Course Creation Credit Consumption
-- This test verifies that creating a course actually consumes credits

-- 1. Check current credit state
SELECT '=== CURRENT CREDIT STATE ===' as status;

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

-- 2. Create a test course to trigger credit consumption
SELECT '=== CREATING TEST COURSE ===' as status;

INSERT INTO courses (
  creator_id,
  course_title,
  course_plan,
  system_prompt,
  track_type
) VALUES (
  '23401d96-3247-40b7-8997-12cdf5301a76',
  'Test Course - Credit Verification',
  '{"test": "verification", "modules": []}'::jsonb,
  'Test system prompt for credit verification',
  'Educational'
) RETURNING id, course_title, creator_id, created_at;

-- 3. Check credit state after course creation
SELECT '=== CREDIT STATE AFTER COURSE CREATION ===' as status;

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

-- 4. Check credit usage log
SELECT '=== CREDIT USAGE LOG ===' as status;

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

-- 5. Test the credit summary function
SELECT '=== CREDIT SUMMARY FUNCTION ===' as status;

SELECT * FROM public.get_user_credit_summary('23401d96-3247-40b7-8997-12cdf5301a76');

-- 6. Verify the course was created
SELECT '=== VERIFY COURSE CREATION ===' as status;

SELECT 
  id,
  course_title,
  creator_id,
  created_at
FROM courses 
WHERE creator_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC
LIMIT 3;

SELECT '=== VERIFICATION COMPLETE ===' as status; 