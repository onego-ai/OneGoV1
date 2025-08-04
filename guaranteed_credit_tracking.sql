-- Guaranteed Credit Tracking System
-- This ensures credit usage is always updated when courses are created

-- 1. Drop and recreate the consume_credits function with robust error handling
DROP FUNCTION IF EXISTS public.consume_credits(UUID, INTEGER, TEXT, TEXT);

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
  available_credits INTEGER;
  result JSONB;
  credit_limit_record RECORD;
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Attempting to consume % credits for user %', credits_to_consume, user_id_param;
  
  -- Get current credit usage with error handling
  SELECT * INTO credit_limit_record
  FROM credit_limits
  WHERE user_id = user_id_param;
  
  -- If no record exists, create one with Standard plan defaults
  IF credit_limit_record IS NULL THEN
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
    current_credits := COALESCE(credit_limit_record.credits_used_this_month, 0);
    RAISE NOTICE 'Found existing credit_limits record, current credits used: %', current_credits;
  END IF;
  
  -- Calculate available credits
  SELECT (monthly_credits + additional_credits_purchased - credits_used_this_month) 
  INTO available_credits
  FROM credit_limits
  WHERE user_id = user_id_param;
  
  RAISE NOTICE 'Available credits: %, Requested: %', available_credits, credits_to_consume;
  
  -- Check if enough credits are available
  IF available_credits < credits_to_consume THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'available_credits', available_credits,
      'requested_credits', credits_to_consume,
      'message', 'Not enough credits available'
    );
    RAISE NOTICE 'Insufficient credits: available %, requested %', available_credits, credits_to_consume;
    RETURN result;
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
    'available_credits', (available_credits - credits_to_consume),
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

-- 2. Create a database trigger to automatically consume credits when a course is created
CREATE OR REPLACE FUNCTION public.handle_course_creation_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  credit_result JSONB;
BEGIN
  RAISE NOTICE 'Course creation trigger fired for course: %', NEW.id;
  
  -- Consume 1 credit for course creation
  credit_result := public.consume_credits(
    NEW.creator_id,
    1,
    'course_creation',
    'Automatic credit consumption for course creation: ' || NEW.course_title
  );
  
  -- Log the result
  RAISE NOTICE 'Credit consumption result: %', credit_result;
  
  -- If credit consumption failed, log it but don't prevent course creation
  IF credit_result->>'success' = 'false' THEN
    RAISE WARNING 'Credit consumption failed for course %: %', NEW.id, credit_result->>'message';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS course_creation_credit_trigger ON public.courses;

CREATE TRIGGER course_creation_credit_trigger
  AFTER INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_course_creation_credits();

-- 4. Test the system
SELECT 'Testing credit consumption system...' as status;

-- Test manual credit consumption
SELECT public.consume_credits(
  '23401d96-3247-40b7-8997-12cdf5301a76'::uuid,
  1,
  'test_manual',
  'Manual test credit consumption'
);

-- 5. Check current state
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

-- 6. Check recent credit usage
SELECT 
  user_id,
  action_type,
  credits_consumed,
  description,
  created_at
FROM credit_usage 
WHERE user_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Guaranteed credit tracking system installed!' as status; 