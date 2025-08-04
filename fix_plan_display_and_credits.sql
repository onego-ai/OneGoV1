-- Step 1: Fix the plan_type constraint to allow all plan types
ALTER TABLE public.credit_limits DROP CONSTRAINT IF EXISTS credit_limits_plan_type_check;

ALTER TABLE public.credit_limits 
ADD CONSTRAINT credit_limits_plan_type_check 
CHECK (plan_type IN ('Free', 'Standard', 'Pro', 'Business', 'Enterprise'));

-- Step 2: Sync all existing credit limits with current user plans
UPDATE public.credit_limits 
SET 
  plan_type = p.plan,
  monthly_credits = CASE 
    WHEN p.plan = 'Free' THEN 50
    WHEN p.plan = 'Standard' THEN 500
    WHEN p.plan = 'Pro' THEN 1500
    WHEN p.plan = 'Business' THEN 4000
    WHEN p.plan = 'Enterprise' THEN 10000
    ELSE 50
  END,
  updated_at = now()
FROM public.profiles p
WHERE credit_limits.user_id = p.id;

-- Step 3: Create credit limits for users who don't have them
INSERT INTO public.credit_limits (
  user_id,
  plan_type,
  monthly_credits,
  credits_used_this_month,
  reset_date,
  created_at,
  updated_at
)
SELECT 
  p.id,
  p.plan,
  CASE 
    WHEN p.plan = 'Free' THEN 50
    WHEN p.plan = 'Standard' THEN 500
    WHEN p.plan = 'Pro' THEN 1500
    WHEN p.plan = 'Business' THEN 4000
    WHEN p.plan = 'Enterprise' THEN 10000
    ELSE 50
  END,
  0,
  (CURRENT_DATE + INTERVAL '1 month'),
  now(),
  now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.credit_limits cl WHERE cl.user_id = p.id
);

-- Step 4: Update the get_user_credit_summary function to use profiles.plan
CREATE OR REPLACE FUNCTION public.get_user_credit_summary(user_id_param UUID)
RETURNS TABLE(
  plan_type TEXT,
  monthly_credits INTEGER,
  credits_used_this_month INTEGER,
  available_credits INTEGER,
  total_credits INTEGER,
  reset_date DATE,
  additional_credits_purchased INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_limits RECORD;
  user_plan TEXT;
BEGIN
  -- Get user's plan from profiles table
  SELECT plan INTO user_plan
  FROM public.profiles
  WHERE id = user_id_param;
  
  -- Get user's credit limits
  SELECT * INTO user_limits
  FROM public.credit_limits
  WHERE user_id = user_id_param;
  
  -- If no limits record exists, create one
  IF user_limits IS NULL THEN
    INSERT INTO public.credit_limits (
      user_id,
      plan_type,
      monthly_credits,
      credits_used_this_month,
      reset_date
    ) VALUES (
      user_id_param,
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
    
    SELECT * INTO user_limits
    FROM public.credit_limits
    WHERE user_id = user_id_param;
  END IF;
  
  -- Check if we need to reset monthly credits
  IF user_limits.reset_date <= CURRENT_DATE THEN
    UPDATE public.credit_limits
    SET 
      credits_used_this_month = 0,
      reset_date = (CURRENT_DATE + INTERVAL '1 month'),
      updated_at = now()
    WHERE user_id = user_id_param;
    
    user_limits.credits_used_this_month := 0;
    user_limits.reset_date := (CURRENT_DATE + INTERVAL '1 month');
  END IF;
  
  -- Update plan_type to match current user plan
  IF user_limits.plan_type != user_plan THEN
    UPDATE public.credit_limits
    SET 
      plan_type = user_plan,
      monthly_credits = CASE 
        WHEN user_plan = 'Free' THEN 50
        WHEN user_plan = 'Standard' THEN 500
        WHEN user_plan = 'Pro' THEN 1500
        WHEN user_plan = 'Business' THEN 4000
        WHEN user_plan = 'Enterprise' THEN 10000
        ELSE 50
      END,
      updated_at = now()
    WHERE user_id = user_id_param;
    
    user_limits.plan_type := user_plan;
    user_limits.monthly_credits := CASE 
      WHEN user_plan = 'Free' THEN 50
      WHEN user_plan = 'Standard' THEN 500
      WHEN user_plan = 'Pro' THEN 1500
      WHEN user_plan = 'Business' THEN 4000
      WHEN user_plan = 'Enterprise' THEN 10000
      ELSE 50
    END;
  END IF;
  
  RETURN QUERY SELECT
    user_limits.plan_type,
    user_limits.monthly_credits,
    user_limits.credits_used_this_month,
    (user_limits.monthly_credits + user_limits.additional_credits_purchased) - user_limits.credits_used_this_month,
    user_limits.monthly_credits + user_limits.additional_credits_purchased,
    user_limits.reset_date,
    user_limits.additional_credits_purchased;
END;
$$;

-- Step 5: Test the fix for your specific user
SELECT 
  p.plan as profile_plan,
  cl.plan_type as credit_plan_type,
  cl.monthly_credits,
  cl.credits_used_this_month,
  (cl.monthly_credits + cl.additional_credits_purchased - cl.credits_used_this_month) as available_credits
FROM profiles p
LEFT JOIN credit_limits cl ON p.id = cl.user_id
WHERE p.id = '23401d96-3247-40b7-8997-12cdf5301a76';

-- Step 6: Test the updated function
SELECT * FROM public.get_user_credit_summary('23401d96-3247-40b7-8997-12cdf5301a76'); 