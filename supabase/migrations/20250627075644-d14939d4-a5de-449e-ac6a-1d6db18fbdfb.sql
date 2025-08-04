
-- Create subscribers table to track Stripe subscriptions
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  licenses_purchased INTEGER NOT NULL DEFAULT 1,
  licenses_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for subscribers table
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE
USING (true);

CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (true);

-- Create invitations table to track team invites
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  inviter_email TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Standard',
  status TEXT NOT NULL DEFAULT 'pending',
  magic_link_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS for invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "view_own_invitations" ON public.invitations
FOR SELECT
USING (inviter_id = auth.uid());

CREATE POLICY "create_invitations" ON public.invitations
FOR INSERT
WITH CHECK (inviter_id = auth.uid());

-- Create course usage tracking table for daily limits
CREATE TABLE public.course_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  courses_created_today INTEGER NOT NULL DEFAULT 0,
  last_course_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for course_usage
ALTER TABLE public.course_usage ENABLE ROW LEVEL SECURITY;

-- Policies for course_usage
CREATE POLICY "view_own_usage" ON public.course_usage
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "update_own_usage" ON public.course_usage
FOR ALL
USING (user_id = auth.uid());

-- Create active sessions table for session management
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for active_sessions
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for active_sessions
CREATE POLICY "manage_own_sessions" ON public.active_sessions
FOR ALL
USING (user_id = auth.uid());

-- Update Jason's profile to Pro plan
UPDATE public.profiles 
SET plan = 'Pro'::subscription_plan 
WHERE id = (SELECT id FROM auth.users WHERE email = 'jason@onego.ai');

-- Insert subscriber record for Jason
INSERT INTO public.subscribers (
  user_id, 
  email, 
  subscribed, 
  subscription_tier, 
  licenses_purchased, 
  licenses_used
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'jason@onego.ai'),
  'jason@onego.ai',
  true,
  'Pro',
  10,
  1
) ON CONFLICT (email) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'Pro',
  licenses_purchased = 10,
  licenses_used = 1;
