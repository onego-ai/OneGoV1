-- Simple Credit Test
-- This tests the most basic credit operations

-- 1. Check if credit_limits table has any data for the user
SELECT '=== CHECKING CREDIT_LIMITS ===' as status;

SELECT 
  user_id,
  plan_type,
  monthly_credits,
  credits_used_this_month,
  additional_credits_purchased,
  created_at,
  updated_at
FROM credit_limits 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- 2. Check if credit_usage table has any data
SELECT '=== CHECKING CREDIT_USAGE ===' as status;

SELECT COUNT(*) as total_entries FROM credit_usage;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
ORDER BY created_at DESC
LIMIT 5;

-- 3. Try a direct INSERT into credit_usage table
SELECT '=== TESTING DIRECT INSERT ===' as status;

INSERT INTO credit_usage (
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
) VALUES (
  '23401d96-3247-40b7-8997-12cdf5301a76',
  'direct_test',
  1,
  'Direct insert test',
  now()
);

-- 4. Check if the direct insert worked
SELECT '=== CHECKING AFTER DIRECT INSERT ===' as status;

SELECT COUNT(*) as total_entries FROM credit_usage;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
ORDER BY created_at DESC
LIMIT 5;

-- 5. Try a direct UPDATE to credit_limits table
SELECT '=== TESTING DIRECT UPDATE ===' as status;

UPDATE credit_limits
SET 
  credits_used_this_month = COALESCE(credits_used_this_month, 0) + 1,
  updated_at = now()
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- 6. Check if the direct update worked
SELECT '=== CHECKING AFTER DIRECT UPDATE ===' as status;

SELECT 
  user_id,
  plan_type,
  monthly_credits,
  credits_used_this_month,
  additional_credits_purchased,
  created_at,
  updated_at
FROM credit_limits 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- 7. Check RLS policies on credit_usage table
SELECT '=== CHECKING RLS POLICIES ===' as status;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'credit_usage';

-- 8. Check RLS policies on credit_limits table
SELECT '=== CHECKING CREDIT_LIMITS RLS ===' as status;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'credit_limits';

SELECT '=== SIMPLE TEST COMPLETE ===' as status; 