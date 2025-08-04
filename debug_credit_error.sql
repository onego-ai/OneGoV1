-- Debug credit consumption error

-- 1. Check current credit state
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

-- 2. Check if consume_credits function exists and test it
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'consume_credits';

-- 3. Test the consume_credits function manually
SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'test_manual',
  'Manual test from SQL'
);

-- 4. Check credit usage table for recent entries
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

-- 5. Check if there are any recent courses created
SELECT 
  id,
  course_title,
  creator_id,
  created_at
FROM courses 
WHERE creator_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC
LIMIT 3;

-- 6. Check the function parameters
SELECT 
  p.parameter_name,
  p.data_type,
  p.parameter_default,
  p.ordinal_position
FROM information_schema.parameters p
JOIN information_schema.routines r ON p.specific_name = r.specific_name
WHERE r.routine_name = 'consume_credits'
ORDER BY p.ordinal_position; 