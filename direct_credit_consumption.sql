-- Create a simple direct credit consumption function
CREATE OR REPLACE FUNCTION public.consume_credits_direct(
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
  result JSONB;
BEGIN
  -- Get current credit usage
  SELECT credits_used_this_month INTO current_credits
  FROM credit_limits
  WHERE user_id = user_id_param;
  
  -- If no record exists, create one
  IF current_credits IS NULL THEN
    INSERT INTO credit_limits (
      user_id,
      plan_type,
      monthly_credits,
      credits_used_this_month,
      reset_date
    ) VALUES (
      user_id_param,
      'Standard',
      500,
      0,
      (CURRENT_DATE + INTERVAL '1 month')
    );
    current_credits := 0;
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

-- Test the direct function
SELECT * FROM public.consume_credits_direct(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'course_creation',
  'Test direct credit consumption'
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