-- Check and Fix Credit Usage Constraint
-- This will check the exact constraint and fix it

-- 1. Check the exact constraint definition
SELECT '=== CHECKING EXACT CONSTRAINT ===' as status;

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'credit_usage'::regclass AND conname = 'credit_usage_action_type_check';

-- 2. Check the credit_usage table structure
SELECT '=== CHECKING TABLE STRUCTURE ===' as status;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'credit_usage'
ORDER BY ordinal_position;

-- 3. Check if there are any existing entries to see what action_type values are used
SELECT '=== CHECKING EXISTING ACTION_TYPE VALUES ===' as status;

SELECT DISTINCT action_type FROM credit_usage ORDER BY action_type;

-- 4. Drop the problematic constraint
SELECT '=== DROPPING CONSTRAINT ===' as status;

ALTER TABLE credit_usage DROP CONSTRAINT IF EXISTS credit_usage_action_type_check;

-- 5. Try inserting with course_creation
SELECT '=== TESTING INSERT AFTER CONSTRAINT DROP ===' as status;

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
  'Test after constraint drop',
  now()
);

-- 6. Check if insert worked
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

-- 7. Test the consume_credits function
SELECT '=== TESTING CONSUME_CREDITS FUNCTION ===' as status;

SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'course_creation',
  'Testing function after constraint fix'
);

-- 8. Check final results
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

-- 9. Create a proper constraint that allows common action types
SELECT '=== CREATING PROPER CONSTRAINT ===' as status;

ALTER TABLE credit_usage ADD CONSTRAINT credit_usage_action_type_check 
CHECK (action_type IN ('course_creation', 'pdf_processing', 'website_scraping', 'test', 'manual', 'automatic'));

SELECT '=== CONSTRAINT FIX COMPLETE ===' as status; 