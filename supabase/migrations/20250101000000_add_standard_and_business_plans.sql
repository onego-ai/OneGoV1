-- Add Standard and Business plans to the subscription_plan enum
ALTER TYPE public.subscription_plan ADD VALUE 'Standard';
ALTER TYPE public.subscription_plan ADD VALUE 'Business';

-- Update the enum to have the correct order: Free, Standard, Pro, Business, Enterprise
-- Note: PostgreSQL doesn't allow reordering enum values directly, so we need to recreate the type

-- First, create a new enum with the correct order
CREATE TYPE public.subscription_plan_new AS ENUM ('Free', 'Standard', 'Pro', 'Business', 'Enterprise');

-- Remove the default values temporarily from both tables
ALTER TABLE public.profiles ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE public.subscribers ALTER COLUMN subscription_tier DROP DEFAULT;

-- Update profiles table to use the new enum
ALTER TABLE public.profiles 
  ALTER COLUMN plan TYPE public.subscription_plan_new 
  USING plan::text::public.subscription_plan_new;

-- Update subscribers table to use the new enum
ALTER TABLE public.subscribers 
  ALTER COLUMN subscription_tier TYPE public.subscription_plan_new 
  USING subscription_tier::text::public.subscription_plan_new;

-- Restore the default values for both tables
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'Free'::public.subscription_plan_new;
ALTER TABLE public.subscribers ALTER COLUMN subscription_tier SET DEFAULT 'Free'::public.subscription_plan_new;

-- Drop the old enum
DROP TYPE public.subscription_plan;

-- Rename the new enum to the original name
ALTER TYPE public.subscription_plan_new RENAME TO subscription_plan;

-- Update credit limits to include the new plans
UPDATE public.credit_limits 
SET plan_type = 'Standard' 
WHERE plan_type = 'Pro' AND user_id IN (
  SELECT id FROM public.profiles WHERE plan = 'Standard'
);

UPDATE public.credit_limits 
SET plan_type = 'Business' 
WHERE plan_type = 'Enterprise' AND user_id IN (
  SELECT id FROM public.profiles WHERE plan = 'Business'
);

-- Update the credit limits function to handle the new plans
CREATE OR REPLACE FUNCTION public.initialize_credit_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.credit_limits (
    user_id,
    plan_type,
    monthly_credits,
    credits_used_this_month,
    reset_date
  ) VALUES (
    NEW.id,
    COALESCE(NEW.plan, 'Free'),
    CASE 
      WHEN NEW.plan = 'Free' THEN 50
      WHEN NEW.plan = 'Standard' THEN 500
      WHEN NEW.plan = 'Pro' THEN 1500
      WHEN NEW.plan = 'Business' THEN 4000
      WHEN NEW.plan = 'Enterprise' THEN 10000
      ELSE 50
    END,
    0,
    (CURRENT_DATE + INTERVAL '1 month')
  );
  
  RETURN NEW;
END;
$$;

-- Update the PDF access function to include Standard and Business plans
CREATE OR REPLACE FUNCTION public.can_access_pdf_processing(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_plan TEXT;
BEGIN
  SELECT plan INTO user_plan
  FROM public.profiles
  WHERE id = user_id_param;
  
  -- Standard, Pro, Business, and Enterprise users can access PDF processing
  RETURN user_plan IN ('Standard', 'Pro', 'Business', 'Enterprise');
END;
$$; 