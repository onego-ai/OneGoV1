-- Create credit tracking system
-- This migration adds comprehensive credit tracking for PDF processing, web scraping, and AI course generation

-- Create credit_usage table to track all credit consumption
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('pdf_processing', 'web_scraping', 'ai_course_generation', 'course_session')),
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit_limits table to store user's credit limits based on their plan
CREATE TABLE IF NOT EXISTS public.credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('Free', 'Pro', 'Enterprise')),
  monthly_credits INTEGER NOT NULL DEFAULT 50,
  credits_used_this_month INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  additional_credits_purchased INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for credit_usage
CREATE POLICY "Users can view their own credit usage" ON public.credit_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit usage" ON public.credit_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit usage" ON public.credit_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Create policies for credit_limits
CREATE POLICY "Users can view their own credit limits" ON public.credit_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit limits" ON public.credit_limits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit limits" ON public.credit_limits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all credit limits" ON public.credit_limits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON public.credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_action_type ON public.credit_usage(action_type);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON public.credit_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_limits_user_id ON public.credit_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_limits_plan_type ON public.credit_limits(plan_type);

-- Function to initialize credit limits for new users
CREATE OR REPLACE FUNCTION public.initialize_credit_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Set credit limits based on plan type
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
      WHEN NEW.plan = 'Pro' THEN 1500
      WHEN NEW.plan = 'Enterprise' THEN 10000
      ELSE 50
    END,
    0,
    (CURRENT_DATE + INTERVAL '1 month')
  );
  
  RETURN NEW;
END;
$$;

-- Function to check if user has enough credits
CREATE OR REPLACE FUNCTION public.check_credit_availability(
  user_id_param UUID,
  credits_needed INTEGER DEFAULT 1
)
RETURNS TABLE(
  has_credits BOOLEAN,
  available_credits INTEGER,
  total_credits INTEGER,
  plan_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_limits RECORD;
  current_month_start DATE;
BEGIN
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
      'Free',
      50,
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
  
  -- Calculate available credits
  DECLARE
    available_credits INTEGER;
    total_credits INTEGER;
  BEGIN
    total_credits := user_limits.monthly_credits + user_limits.additional_credits_purchased;
    available_credits := total_credits - user_limits.credits_used_this_month;
    
    RETURN QUERY SELECT
      available_credits >= credits_needed,
      available_credits,
      total_credits,
      user_limits.plan_type;
  END;
END;
$$;

-- Function to consume credits
CREATE OR REPLACE FUNCTION public.consume_credits(
  user_id_param UUID,
  action_type_param TEXT,
  credits_to_consume INTEGER DEFAULT 1,
  description_param TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  credit_check RECORD;
BEGIN
  -- Check if user has enough credits
  SELECT * INTO credit_check
  FROM public.check_credit_availability(user_id_param, credits_to_consume);
  
  IF NOT credit_check.has_credits THEN
    RETURN FALSE;
  END IF;
  
  -- Consume the credits
  UPDATE public.credit_limits
  SET 
    credits_used_this_month = credits_used_this_month + credits_to_consume,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Record the usage
  INSERT INTO public.credit_usage (
    user_id,
    action_type,
    credits_consumed,
    description,
    metadata
  ) VALUES (
    user_id_param,
    action_type_param,
    credits_to_consume,
    description_param,
    metadata_param
  );
  
  RETURN TRUE;
END;
$$;

-- Function to get user's credit summary
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
BEGIN
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
      'Free',
      50,
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

-- Function to check if user can access PDF processing (Pro+ only)
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
  
  -- Only Pro and Enterprise users can access PDF processing
  RETURN user_plan IN ('Pro', 'Enterprise');
END;
$$;

-- Create trigger to initialize credit limits for new users
CREATE TRIGGER initialize_credit_limits_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_credit_limits();

-- Initialize credit limits for existing users
INSERT INTO public.credit_limits (user_id, plan_type, monthly_credits, credits_used_this_month, reset_date)
SELECT 
  id,
  COALESCE(plan, 'Free'),
  CASE 
    WHEN plan = 'Free' THEN 50
    WHEN plan = 'Pro' THEN 1500
    WHEN plan = 'Enterprise' THEN 10000
    ELSE 50
  END,
  0,
  (CURRENT_DATE + INTERVAL '1 month')
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.credit_limits); 