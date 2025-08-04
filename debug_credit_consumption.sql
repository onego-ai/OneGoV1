-- Debug: Check current state
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

-- Debug: Check if consume_credits function exists and works
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'consume_credits';

-- Debug: Test consume_credits function manually (commented out - function doesn't exist)
-- SELECT * FROM consume_credits(
--   '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
--   1,
--   'test_consumption',
--   'Debug test credit consumption'
-- );

-- Debug: Check credit_usage table
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

-- Debug: Check after consumption
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