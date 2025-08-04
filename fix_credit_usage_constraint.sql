-- Fix Credit Usage Constraint Issue
-- This checks and fixes the action_type constraint

-- 1. Check the constraint on credit_usage table
SELECT '=== CHECKING CREDIT_USAGE CONSTRAINTS ===' as status;

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'credit_usage'::regclass;

-- 2. Check what values are allowed for action_type
SELECT '=== CHECKING ACTION_TYPE VALUES ===' as status;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'credit_usage' AND column_name = 'action_type';

-- 3. Check if action_type is an enum
SELECT '=== CHECKING IF ACTION_TYPE IS ENUM ===' as status;

SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%action%' OR t.typname LIKE '%credit%'
ORDER BY t.typname, e.enumsortorder;

-- 4. Try inserting with a valid action_type value
SELECT '=== TESTING WITH VALID ACTION_TYPE ===' as status;

INSERT INTO credit_usage (
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
) VALUES (
  '23401d96-3247-40b7-8997-12cdf5301a76',
  'course_creation',
  1,
  'Test with valid action_type',
  now()
);

-- 5. Check if the insert worked
SELECT '=== CHECKING INSERT RESULT ===' as status;

SELECT COUNT(*) as credit_usage_entries FROM credit_usage;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
ORDER BY created_at DESC
LIMIT 5;

-- 6. Test the consume_credits function with valid action_type
SELECT '=== TESTING CONSUME_CREDITS FUNCTION ===' as status;

SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'course_creation',
  'Testing function with valid action_type'
);

-- 7. Check final results
SELECT '=== FINAL RESULTS ===' as status;

SELECT COUNT(*) as credit_usage_entries FROM credit_usage;

SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
ORDER BY created_at DESC
LIMIT 5;

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

SELECT '=== CONSTRAINT FIX COMPLETE ===' as status; 