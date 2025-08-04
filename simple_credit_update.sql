-- Very simple credit consumption function
CREATE OR REPLACE FUNCTION public.simple_consume_credit(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_used INTEGER;
BEGIN
  -- Get current credits used
  SELECT COALESCE(credits_used_this_month, 0) INTO current_used
  FROM credit_limits
  WHERE user_id = user_id_param;
  
  -- Update credits used
  UPDATE credit_limits
  SET 
    credits_used_this_month = current_used + 1,
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
    'course_creation',
    1,
    'Simple credit consumption test',
    now()
  );
  
  RETURN 'Success: Credits consumed. Previous: ' || current_used || ', New: ' || (current_used + 1);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Test the simple function
SELECT public.simple_consume_credit('23401d96-3247-40b7-8997-12cdf5301a76');

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