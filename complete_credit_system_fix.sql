-- Complete Credit System Fix
-- This script ensures all credit-related functions and tables exist and work properly

-- 1. First, let's check what we have
SELECT 'Checking existing functions...' as status;

-- 2. Create the consume_credits function if it doesn't exist
CREATE OR REPLACE FUNCTION public.consume_credits(
  user_id_param UUID,
  credits_to_consume INTEGER DEFAULT 1,
  action_type_param TEXT DEFAULT 'course_creation',
  description_param TEXT DEFAULT 'Credit consumption'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_credits INTEGER;
  new_credits_used INTEGER;
  available_credits INTEGER;
  result JSONB;
BEGIN
  -- Get current credit usage
  SELECT COALESCE(credits_used_this_month, 0) INTO current_credits
  FROM credit_limits
  WHERE user_id = user_id_param;
  
  -- If no record exists, create one with Standard plan defaults
  IF current_credits IS NULL THEN
    INSERT INTO credit_limits (
      user_id,
      plan_type,
      monthly_credits,
      credits_used_this_month,
      reset_date,
      additional_credits_purchased
    ) VALUES (
      user_id_param,
      'Standard',
      500,
      0,
      (CURRENT_DATE + INTERVAL '1 month'),
      0
    );
    current_credits := 0;
  END IF;
  
  -- Calculate available credits
  SELECT (monthly_credits + additional_credits_purchased - credits_used_this_month) 
  INTO available_credits
  FROM credit_limits
  WHERE user_id = user_id_param;
  
  -- Check if enough credits are available
  IF available_credits < credits_to_consume THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'available_credits', available_credits,
      'requested_credits', credits_to_consume,
      'message', 'Not enough credits available'
    );
    RETURN result;
  END IF;
  
  -- Calculate new credits used
  new_credits_used := current_credits + credits_to_consume;
  
  -- Update credit limits
  UPDATE credit_limits
  SET 
    credits_used_this_month = new_credits_used,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Log the usage
  INSERT INTO credit_usage (
    user_id,
    action_type,
    credits_consumed,
    description,
    created_at
  ) VALUES (
    user_id_param,
    action_type_param,
    credits_to_consume,
    description_param,
    now()
  );
  
  -- Return result
  result := jsonb_build_object(
    'success', true,
    'credits_consumed', credits_to_consume,
    'previous_credits_used', current_credits,
    'new_credits_used', new_credits_used,
    'available_credits', (available_credits - credits_to_consume),
    'message', 'Credits consumed successfully'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to consume credits'
    );
    RETURN result;
END;
$$;

-- 3. Create a simple test function
CREATE OR REPLACE FUNCTION public.test_credit_consumption(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  result := public.consume_credits(user_id_param, 1, 'test', 'Test credit consumption');
  
  IF result->>'success' = 'true' THEN
    RETURN 'SUCCESS: ' || (result->>'credits_consumed') || ' credit consumed. Available: ' || (result->>'available_credits');
  ELSE
    RETURN 'ERROR: ' || (result->>'message');
  END IF;
END;
$$;

-- 4. Test the functions
SELECT 'Testing credit consumption...' as status;

-- Test with the current user
SELECT public.test_credit_consumption('23401d96-3247-40b7-8997-12cdf5301a76');

-- 5. Check the results
SELECT 'Checking results...' as status;

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

-- 6. Check credit usage log
SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC
LIMIT 3;

SELECT 'Credit system fix completed!' as status; 