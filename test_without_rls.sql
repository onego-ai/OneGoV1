-- Test Credit Operations Without RLS
-- This temporarily disables RLS to test if that's blocking operations

-- 1. Check current RLS status
SELECT '=== CHECKING RLS STATUS ===' as status;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('credit_usage', 'credit_limits');

-- 2. Temporarily disable RLS on credit_usage
SELECT '=== DISABLING RLS ON CREDIT_USAGE ===' as status;

ALTER TABLE credit_usage DISABLE ROW LEVEL SECURITY;

-- 3. Temporarily disable RLS on credit_limits
SELECT '=== DISABLING RLS ON CREDIT_LIMITS ===' as status;

ALTER TABLE credit_limits DISABLE ROW LEVEL SECURITY;

-- 4. Test direct insert into credit_usage
SELECT '=== TESTING INSERT WITHOUT RLS ===' as status;

INSERT INTO credit_usage (
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
) VALUES (
  '23401d96-3247-40b7-8997-12cdf5301a76',
  'no_rls_test',
  1,
  'Test without RLS',
  now()
);

-- 5. Test direct update to credit_limits
SELECT '=== TESTING UPDATE WITHOUT RLS ===' as status;

UPDATE credit_limits
SET 
  credits_used_this_month = COALESCE(credits_used_this_month, 0) + 1,
  updated_at = now()
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- 6. Check results
SELECT '=== CHECKING RESULTS ===' as status;

SELECT COUNT(*) as credit_usage_entries FROM credit_usage;

SELECT 
  user_id,
  plan_type,
  monthly_credits,
  credits_used_this_month,
  additional_credits_purchased
FROM credit_limits 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- 7. Test the consume_credits function without RLS
SELECT '=== TESTING CONSUME_CREDITS WITHOUT RLS ===' as status;

SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'no_rls_function_test',
  'Testing function without RLS'
);

-- 8. Check final results
SELECT '=== FINAL RESULTS ===' as status;

SELECT COUNT(*) as credit_usage_entries FROM credit_usage;

SELECT 
  user_id,
  plan_type,
  monthly_credits,
  credits_used_this_month,
  additional_credits_purchased
FROM credit_limits 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- 9. Re-enable RLS (important!)
SELECT '=== RE-ENABLING RLS ===' as status;

ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_limits ENABLE ROW LEVEL SECURITY;

SELECT '=== TEST COMPLETE ===' as status; 