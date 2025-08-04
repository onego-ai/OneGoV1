-- Verify credit functions exist and work

-- 1. Check if consume_credits function exists
SELECT 
  routine_name, 
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'consume_credits';

-- 2. Create the consume_credits function (simplified approach)
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

-- 3. Test the function
SELECT 'Testing consume_credits function...' as status;

SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'test_verification',
  'Verification test'
);

-- 4. Check the result
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

SELECT 'Verification complete!' as status; 