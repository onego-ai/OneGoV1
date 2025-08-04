-- Quick Credit Tracking Diagnostic
-- This script quickly checks the key components

-- 1. Check credit_usage table
SELECT 'CREDIT_USAGE_TABLE' as component, COUNT(*) as count FROM credit_usage;

-- 2. Check if trigger exists
SELECT 'TRIGGER_EXISTS' as component, 
       CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as exists
FROM information_schema.triggers 
WHERE event_object_table = 'courses' AND trigger_name = 'course_creation_credit_trigger';

-- 3. Check if functions exist
SELECT 'CONSUME_CREDITS_FUNCTION' as component,
       CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as exists
FROM information_schema.routines 
WHERE routine_name = 'consume_credits';

SELECT 'HANDLE_COURSE_CREATION_FUNCTION' as component,
       CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as exists
FROM information_schema.routines 
WHERE routine_name = 'handle_course_creation_credits';

-- 4. Check current credit state
SELECT 'CURRENT_CREDITS' as component,
       cl.credits_used_this_month as used,
       (cl.monthly_credits + cl.additional_credits_purchased - cl.credits_used_this_month) as available
FROM credit_limits cl
WHERE cl.user_id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- 5. Test manual credit consumption
SELECT 'MANUAL_TEST' as component, 
       public.consume_credits('23401d96-3247-40b7-8997-12cdf5301a76'::uuid, 1, 'quick_test', 'Quick diagnostic test') as result;

-- 6. Check credit_usage after manual test
SELECT 'CREDIT_USAGE_AFTER_MANUAL' as component, COUNT(*) as count FROM credit_usage;

-- 7. Check credits after manual test
SELECT 'CREDITS_AFTER_MANUAL' as component,
       cl.credits_used_this_month as used,
       (cl.monthly_credits + cl.additional_credits_purchased - cl.credits_used_this_month) as available
FROM credit_limits cl
WHERE cl.user_id = '23401d96-3247-40b7-8997-12cdf5301a76'; 