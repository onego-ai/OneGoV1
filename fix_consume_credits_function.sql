-- Fix consume_credits function
-- This creates a working version of the consume_credits function

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.consume_credits(UUID, INTEGER, TEXT, TEXT);

-- Create a simple, working consume_credits function
CREATE OR REPLACE FUNCTION public.consume_credits(
  user_id_param UUID,
  credits_to_consume INTEGER DEFAULT 1,
  action_type_param TEXT DEFAULT 'course_creation',
  description_param TEXT DEFAULT 'Credit consumption'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  new_credits_used INTEGER;
  result JSONB;
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Attempting to consume % credits for user %', credits_to_consume, user_id_param;
  
  -- Get current credit usage
  SELECT COALESCE(credits_used_this_month, 0) INTO current_credits
  FROM credit_limits
  WHERE user_id = user_id_param;
  
  -- If no record exists, create one
  IF current_credits IS NULL THEN
    RAISE NOTICE 'No credit_limits record found, creating one for user %', user_id_param;
    
    INSERT INTO credit_limits (
      user_id,
      plan_type,
      monthly_credits,
      credits_used_this_month,
      reset_date,
      additional_credits_purchased,
      created_at,
      updated_at
    ) VALUES (
      user_id_param,
      'Standard',
      500,
      0,
      (CURRENT_DATE + INTERVAL '1 month'),
      0,
      now(),
      now()
    );
    
    current_credits := 0;
    RAISE NOTICE 'Created new credit_limits record for user %', user_id_param;
  ELSE
    RAISE NOTICE 'Found existing credit_limits record, current credits used: %', current_credits;
  END IF;
  
  -- Calculate new credits used
  new_credits_used := current_credits + credits_to_consume;
  RAISE NOTICE 'Updating credits used from % to %', current_credits, new_credits_used;
  
  -- Update credit limits
  UPDATE credit_limits
  SET 
    credits_used_this_month = new_credits_used,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Verify the update
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update credit_limits for user %', user_id_param;
  END IF;
  
  RAISE NOTICE 'Successfully updated credit_limits for user %', user_id_param;
  
  -- Log the usage in credit_usage table
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
  
  RAISE NOTICE 'Successfully logged credit usage for user %', user_id_param;
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'credits_consumed', credits_to_consume,
    'previous_credits_used', current_credits,
    'new_credits_used', new_credits_used,
    'message', 'Credits consumed successfully'
  );
  
  RAISE NOTICE 'Credit consumption successful for user %', user_id_param;
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in consume_credits: %', SQLERRM;
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to consume credits'
    );
    RETURN result;
END;
$$;

-- Test the fixed function
SELECT 'Testing fixed consume_credits function...' as status;

SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'fix_test',
  'Testing fixed consume_credits function'
);

-- Check the result
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

-- Check credit usage log
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

SELECT 'Fixed consume_credits function installed!' as status; 