-- Function to automatically consume credits when a course is created
CREATE OR REPLACE FUNCTION public.handle_course_creation_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_plan TEXT;
  available_credits INTEGER;
  total_credits INTEGER;
BEGIN
  -- Get user's plan and credit info
  SELECT 
    p.plan,
    cl.available_credits,
    cl.total_credits
  INTO user_plan, available_credits, total_credits
  FROM profiles p
  LEFT JOIN (
    SELECT 
      user_id,
      (monthly_credits + additional_credits_purchased - credits_used_this_month) as available_credits,
      (monthly_credits + additional_credits_purchased) as total_credits
    FROM credit_limits
  ) cl ON p.id = cl.user_id
  WHERE p.id = NEW.creator_id;

  -- If no credit info found, create default credit limits
  IF available_credits IS NULL THEN
    INSERT INTO credit_limits (
      user_id,
      plan_type,
      monthly_credits,
      credits_used_this_month,
      reset_date
    ) VALUES (
      NEW.creator_id,
      COALESCE(user_plan, 'Free'),
      CASE 
        WHEN user_plan = 'Free' THEN 50
        WHEN user_plan = 'Standard' THEN 500
        WHEN user_plan = 'Pro' THEN 1500
        WHEN user_plan = 'Business' THEN 4000
        WHEN user_plan = 'Enterprise' THEN 10000
        ELSE 50
      END,
      0,
      (CURRENT_DATE + INTERVAL '1 month')
    );
    
    available_credits := CASE 
      WHEN user_plan = 'Free' THEN 50
      WHEN user_plan = 'Standard' THEN 500
      WHEN user_plan = 'Pro' THEN 1500
      WHEN user_plan = 'Business' THEN 4000
      WHEN user_plan = 'Enterprise' THEN 10000
      ELSE 50
    END;
  END IF;

  -- Check if user has enough credits
  IF available_credits < 1 THEN
    RAISE EXCEPTION 'Insufficient credits. You have % credits available. Course creation requires 1 credit.', available_credits;
  END IF;

  -- Consume 1 credit for course creation
  UPDATE credit_limits
  SET 
    credits_used_this_month = credits_used_this_month + 1,
    updated_at = now()
  WHERE user_id = NEW.creator_id;

  -- Log the credit usage
  INSERT INTO credit_usage (
    user_id,
    action_type,
    credits_consumed,
    description,
    metadata
  ) VALUES (
    NEW.creator_id,
    'course_creation',
    1,
    'Course creation: ' || NEW.course_title,
    jsonb_build_object(
      'course_id', NEW.id,
      'course_title', NEW.course_title,
      'track_type', NEW.track_type
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger to automatically handle credit consumption on course creation
DROP TRIGGER IF EXISTS course_creation_credit_trigger ON public.courses;
CREATE TRIGGER course_creation_credit_trigger
  AFTER INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_course_creation_credits();

-- Function to get course creation credit summary
CREATE OR REPLACE FUNCTION public.get_course_creation_credits_summary(user_id_param UUID)
RETURNS TABLE(
  total_courses_created INTEGER,
  credits_consumed INTEGER,
  available_credits INTEGER,
  plan_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(c.id)::INTEGER as total_courses_created,
    COALESCE(SUM(cu.credits_consumed), 0)::INTEGER as credits_consumed,
    COALESCE(cl.monthly_credits + cl.additional_credits_purchased - cl.credits_used_this_month, 0)::INTEGER as available_credits,
    COALESCE(cl.plan_type, 'Free') as plan_type
  FROM profiles p
  LEFT JOIN courses c ON p.id = c.creator_id
  LEFT JOIN credit_usage cu ON p.id = cu.user_id AND cu.action_type = 'course_creation'
  LEFT JOIN credit_limits cl ON p.id = cl.user_id
  WHERE p.id = user_id_param
  GROUP BY cl.monthly_credits, cl.additional_credits_purchased, cl.credits_used_this_month, cl.plan_type;
END;
$$;

-- Test the function for your user
SELECT * FROM public.get_course_creation_credits_summary('23401d96-3247-40b7-8997-12cdf5301a76'); 