-- Check what credit-related functions exist
SELECT 
  routine_name, 
  routine_type,
  data_type,
  parameter_name,
  parameter_mode,
  parameter_default,
  data_type as param_data_type
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.routine_name = p.specific_name
WHERE routine_name LIKE '%credit%' 
  OR routine_name LIKE '%consume%'
ORDER BY routine_name, ordinal_position;

-- Check the credit_limits table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'credit_limits'
ORDER BY ordinal_position;

-- Check the credit_usage table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'credit_usage'
ORDER BY ordinal_position;

-- Check if credit_limits table has any data
SELECT COUNT(*) as credit_limits_count FROM credit_limits;

-- Check if credit_usage table has any data
SELECT COUNT(*) as credit_usage_count FROM credit_usage;

-- Check current user's credit status
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