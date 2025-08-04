-- ONEGO Learning - Complete Database Schema
-- Run this script in your new Supabase project SQL editor

-- =====================================================
-- ENUMS
-- =====================================================

-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('Admin', 'Standard');

-- Create subscription plans enum  
CREATE TYPE public.subscription_plan AS ENUM ('Free', 'Pro', 'Enterprise');

-- =====================================================
-- TABLES
-- =====================================================

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_name TEXT,
  role app_role NOT NULL DEFAULT 'Admin',
  plan subscription_plan NOT NULL DEFAULT 'Free',
  group_id UUID,
  team TEXT[] DEFAULT ARRAY['General'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_title TEXT NOT NULL,
  course_plan JSONB NOT NULL,
  system_prompt TEXT NOT NULL,
  track_type TEXT NOT NULL, -- 'Corporate' or 'Educational'
  status TEXT DEFAULT 'drafted', -- 'drafted', 'published', 'archived'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create course assignments table
CREATE TABLE public.course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, group_id)
);

-- Create user performance table
CREATE TABLE public.user_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  points INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  session_data JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'Standard',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  magic_link_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscribers table
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  subscribed BOOLEAN DEFAULT false,
  subscription_tier subscription_plan DEFAULT 'Free',
  licenses_purchased INTEGER DEFAULT 1,
  licenses_used INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create honest box tables
CREATE TABLE public.honest_box_monthly_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  month_year TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.honest_box_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.honest_box_monthly_questions(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create website data table
CREATE TABLE public.website_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  website_url TEXT NOT NULL,
  scraped_data JSONB,
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, website_url)
);

-- Create session feedback table
CREATE TABLE public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create course usage tracking table
CREATE TABLE public.course_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  session_duration INTEGER, -- in seconds
  interactions_count INTEGER DEFAULT 0,
  completion_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create active sessions table
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  session_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_data JSONB,
  UNIQUE(user_id, course_id)
);

-- Create individual course assignments table to track personal assignments
CREATE TABLE public.individual_course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_to_team TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed'
  UNIQUE(user_id, course_id)
);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key constraint for group_id in profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_group 
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

-- Add foreign key constraints to individual_course_assignments table
ALTER TABLE public.individual_course_assignments
ADD CONSTRAINT individual_course_assignments_course_id_fkey
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.individual_course_assignments
ADD CONSTRAINT individual_course_assignments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.individual_course_assignments
ADD CONSTRAINT individual_course_assignments_assigned_by_fkey
FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- =====================================================
-- INDEXES
-- =====================================================

-- Create indexes for better performance
CREATE INDEX idx_profiles_group_id ON public.profiles(group_id);
CREATE INDEX idx_courses_creator_id ON public.courses(creator_id);
CREATE INDEX idx_course_assignments_group_id ON public.course_assignments(group_id);
CREATE INDEX idx_user_performance_user_id ON public.user_performance(user_id);
CREATE INDEX idx_user_performance_course_id ON public.user_performance(course_id);
CREATE INDEX idx_invitations_inviter_id ON public.invitations(inviter_id);
CREATE INDEX idx_invitations_magic_link_token ON public.invitations(magic_link_token);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_subscribers_user_id ON public.subscribers(user_id);
CREATE INDEX idx_subscribers_email ON public.subscribers(email);
CREATE INDEX idx_honest_box_feedback_group_id ON public.honest_box_feedback(group_id);
CREATE INDEX idx_website_data_group_id ON public.website_data(group_id);
CREATE INDEX idx_individual_course_assignments_user_id ON public.individual_course_assignments(user_id);
CREATE INDEX idx_individual_course_assignments_course_id ON public.individual_course_assignments(course_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honest_box_monthly_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honest_box_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_course_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for groups
CREATE POLICY "Admins can manage their groups" ON public.groups
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Users can view groups they belong to" ON public.groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM public.profiles 
      WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  );

-- RLS Policies for courses
CREATE POLICY "Admins can manage their courses" ON public.courses
  FOR ALL USING (creator_id = auth.uid());

CREATE POLICY "Users can view assigned courses" ON public.courses
  FOR SELECT USING (
    id IN (
      SELECT ca.course_id FROM public.course_assignments ca
      JOIN public.profiles p ON p.group_id = ca.group_id
      WHERE p.id = auth.uid()
    )
  );

-- RLS Policies for course assignments
CREATE POLICY "Admins can manage course assignments" ON public.course_assignments
  FOR ALL USING (
    group_id IN (
      SELECT id FROM public.groups WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their assignments" ON public.course_assignments
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.profiles 
      WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  );

-- RLS Policies for user performance
CREATE POLICY "Users can manage their own performance" ON public.user_performance
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view their team's performance" ON public.user_performance
  FOR SELECT USING (
    user_id IN (
      SELECT p.id FROM public.profiles p
      JOIN public.groups g ON p.group_id = g.id
      WHERE g.admin_id = auth.uid()
    )
  );

-- RLS Policies for invitations
CREATE POLICY "Users can manage their invitations" ON public.invitations
  FOR ALL USING (inviter_id = auth.uid());

CREATE POLICY "Users can view invitations for their group" ON public.invitations
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.profiles 
      WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  );

-- RLS Policies for subscribers
CREATE POLICY "Users can view their own subscription" ON public.subscribers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription" ON public.subscribers
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for honest box
CREATE POLICY "Users can view honest box questions for their group" ON public.honest_box_monthly_questions
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.profiles 
      WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  );

CREATE POLICY "Users can submit honest box feedback" ON public.honest_box_feedback
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.profiles 
      WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  );

CREATE POLICY "Users can view honest box feedback for their group" ON public.honest_box_feedback
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.profiles 
      WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  );

-- RLS Policies for website data
CREATE POLICY "Users can manage website data for their group" ON public.website_data
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM public.profiles 
      WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  );

-- RLS Policies for session feedback
CREATE POLICY "Users can manage their own session feedback" ON public.session_feedback
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for course usage
CREATE POLICY "Users can manage their own course usage" ON public.course_usage
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for active sessions
CREATE POLICY "Users can manage their own active sessions" ON public.active_sessions
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for individual course assignments
CREATE POLICY "Users can view their own assignments" 
  ON public.individual_course_assignments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view assignments in their group" 
  ON public.individual_course_assignments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = user_id 
      AND p1.role = 'Admin' 
      AND p1.group_id = p2.group_id
    )
  );

CREATE POLICY "Admins can create assignments for their group members" 
  ON public.individual_course_assignments 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = assigned_by 
    AND EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = user_id 
      AND p1.role = 'Admin' 
      AND p1.group_id = p2.group_id
    )
  );

CREATE POLICY "Admins can update assignments for their group members" 
  ON public.individual_course_assignments 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = user_id 
      AND p1.role = 'Admin' 
      AND p1.group_id = p2.group_id
    )
  );

CREATE POLICY "Admins can delete assignments for their group members" 
  ON public.individual_course_assignments 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = user_id 
      AND p1.role = 'Admin' 
      AND p1.group_id = p2.group_id
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, plan, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'Admin'::app_role),
    'Free'::subscription_plan,
    NEW.raw_user_meta_data->>'company_name'
  );
  RETURN NEW;
END;
$$;

-- Function to create admin group
CREATE OR REPLACE FUNCTION public.create_admin_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_group_id UUID;
BEGIN
  -- Only create a group if the user is an Admin
  IF NEW.role = 'Admin' AND NEW.group_id IS NULL THEN
    -- Create a new group for the admin
    INSERT INTO public.groups (admin_id, group_name)
    VALUES (NEW.id, COALESCE(NEW.company_name, NEW.full_name || '''s Company'))
    RETURNING id INTO new_group_id;
    
    -- Update the profile with the new group_id
    UPDATE public.profiles 
    SET group_id = new_group_id 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create subscriber for new user
CREATE OR REPLACE FUNCTION public.create_subscriber_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create subscriber record for new Free plan users
  IF NEW.plan = 'Free' THEN
    INSERT INTO public.subscribers (
      user_id,
      email,
      subscribed,
      subscription_tier,
      licenses_purchased,
      licenses_used
    )
    SELECT 
      NEW.id,
      au.email,
      false,
      'Free',
      1, -- Free plan gets 1 license
      1  -- Admin counts as 1 used license
    FROM auth.users au
    WHERE au.id = NEW.id
    ON CONFLICT (email) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to initialize honest box for group
CREATE OR REPLACE FUNCTION public.initialize_honest_box_for_group(group_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert the predefined monthly questions rotation for this group
  INSERT INTO public.honest_box_monthly_questions (question, month_year, group_id) VALUES
  ('If you had a magic wand, what''s the first thing you would change at our organisation?', 'January 2025', group_id_param),
  ('What''s one thing that would make your time here 10% better?', 'February 2025', group_id_param),
  ('Share an idea that could help us all work or learn smarter, not harder.', 'March 2025', group_id_param),
  ('What is something our organisation should start doing?', 'April 2025', group_id_param),
  ('What is something our organisation should stop doing?', 'May 2025', group_id_param),
  ('Describe a recent moment where you felt genuinely proud to be part of this organisation. What made it special?', 'June 2025', group_id_param),
  ('What''s a tool, resource, or bit of training you wish you had?', 'July 2025', group_id_param),
  ('How can we improve communication between different teams or departments?', 'August 2025', group_id_param),
  ('What''s one small, inexpensive change that would have a big impact on your day-to-day?', 'September 2025', group_id_param),
  ('What part of our culture do you value the most? How can we build on it?', 'October 2025', group_id_param),
  ('Is there any "red tape" or unnecessary process we could simplify or get rid of?', 'November 2025', group_id_param),
  ('What''s a challenge you''re facing that leadership might not be aware of?', 'December 2025', group_id_param),
  ('How can we better support your professional growth and development here?', 'January 2026', group_id_param),
  ('What makes a great day here? How could we have more of them?', 'February 2026', group_id_param),
  ('If you were in charge for a day, what would be your top priority for the organisation?', 'March 2026', group_id_param),
  ('What''s something positive a colleague or manager did recently that you reckon deserves a shout-out?', 'April 2026', group_id_param),
  ('How can we make our physical workspace or digital environment better?', 'May 2026', group_id_param),
  ('What''s a skill you have that you feel is being underused?', 'June 2026', group_id_param),
  ('What are we getting right that we should do more of?', 'July 2026', group_id_param),
  ('What question do you think we should ask next month?', 'August 2026', group_id_param);
END;
$$;

-- Function to trigger honest box initialization
CREATE OR REPLACE FUNCTION public.trigger_initialize_honest_box()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Initialize HonestBox for the new group
  PERFORM public.initialize_honest_box_for_group(NEW.id);
  RETURN NEW;
END;
$$;

-- Function to get inviter group id
CREATE OR REPLACE FUNCTION public.get_inviter_group_id(inviter_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER SET search_path = public
AS $$
  SELECT group_id 
  FROM public.profiles 
  WHERE id = inviter_user_id 
  LIMIT 1;
$$;

-- Function to set invitation group id
CREATE OR REPLACE FUNCTION public.set_invitation_group_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Automatically set group_id based on inviter's group
  IF NEW.group_id IS NULL AND NEW.inviter_id IS NOT NULL THEN
    NEW.group_id := public.get_inviter_group_id(NEW.inviter_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- When an invitation is accepted, ensure proper license usage tracking
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- The license was already incremented when invitation was created
    -- Just ensure the count is accurate
    UPDATE public.subscribers 
    SET updated_at = now()
    WHERE user_id = NEW.inviter_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to increment license usage
CREATE OR REPLACE FUNCTION public.increment_license_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Increment licenses_used for the inviter's subscription
  UPDATE public.subscribers 
  SET licenses_used = licenses_used + 1,
      updated_at = now()
  WHERE user_id = NEW.inviter_id;
  
  RETURN NEW;
END;
$$;

-- Function to decrement license usage
CREATE OR REPLACE FUNCTION public.decrement_license_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Decrement licenses_used for the inviter's subscription
  UPDATE public.subscribers 
  SET licenses_used = GREATEST(licenses_used - 1, 0),
      updated_at = now()
  WHERE user_id = OLD.inviter_id;
  
  RETURN OLD;
END;
$$;

-- Function to recalculate license usage
CREATE OR REPLACE FUNCTION public.recalculate_license_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update licenses_used to match actual pending invitations count
  UPDATE public.subscribers 
  SET licenses_used = (
    SELECT COALESCE(COUNT(*), 0)
    FROM public.invitations 
    WHERE invitations.inviter_id = subscribers.user_id 
    AND invitations.status = 'pending'
  ),
  updated_at = now();
END;
$$;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Delete expired pending invitations
  DELETE FROM public.invitations 
  WHERE status = 'pending' 
  AND expires_at < now();
  
  -- Recalculate license usage to ensure accuracy
  UPDATE public.subscribers 
  SET licenses_used = (
    SELECT COALESCE(COUNT(*), 0)
    FROM public.invitations 
    WHERE invitations.inviter_id = subscribers.user_id 
    AND invitations.status = 'accepted'
  ),
  updated_at = now();
END;
$$;

-- Function to get current user info
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE(user_role app_role, user_group_id uuid)
LANGUAGE sql
STABLE 
SECURITY DEFINER SET search_path = public
AS $$
  SELECT role, group_id
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Function to remove user and cleanup
CREATE OR REPLACE FUNCTION public.remove_user_and_cleanup(user_id_to_remove uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  group_to_update uuid;
BEGIN
  -- Get the current user (admin) and group info
  SELECT auth.uid() INTO admin_id;
  
  -- Get the group of the user being removed
  SELECT group_id INTO group_to_update
  FROM public.profiles 
  WHERE id = user_id_to_remove;
  
  -- Verify the current user is an admin in the same group
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_id 
    AND role = 'Admin' 
    AND group_id = group_to_update
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can remove users from their group';
  END IF;
  
  -- Prevent admin from removing themselves
  IF admin_id = user_id_to_remove THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;
  
  -- Clean up all related data
  DELETE FROM public.individual_course_assignments WHERE user_id = user_id_to_remove;
  DELETE FROM public.user_performance WHERE user_id = user_id_to_remove;
  DELETE FROM public.session_feedback WHERE user_id = user_id_to_remove;
  DELETE FROM public.course_usage WHERE user_id = user_id_to_remove;
  DELETE FROM public.active_sessions WHERE user_id = user_id_to_remove;
  
  -- Delete any courses created by this user
  DELETE FROM public.courses WHERE creator_id = user_id_to_remove;
  
  -- Delete any invitations sent by or to this user
  DELETE FROM public.invitations WHERE inviter_id = user_id_to_remove OR invitee_email = (
    SELECT email FROM auth.users WHERE id = user_id_to_remove
  );
  
  -- Finally, delete the profile (this will cascade to auth.users due to foreign key)
  DELETE FROM public.profiles WHERE id = user_id_to_remove;
  
  -- Update license usage count
  UPDATE public.subscribers 
  SET licenses_used = GREATEST(licenses_used - 1, 0),
      updated_at = now()
  WHERE user_id = admin_id;
  
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for admin group creation
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_admin_group();

-- Create trigger for subscriber creation
CREATE TRIGGER on_profile_created_subscriber
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_subscriber_for_new_user();

-- Create trigger for honest box initialization
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.trigger_initialize_honest_box();

-- Create trigger for invitation group id setting
CREATE TRIGGER on_invitation_created
  BEFORE INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_invitation_group_id();

-- Create trigger for invitation acceptance
CREATE TRIGGER on_invitation_updated
  AFTER UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_acceptance();

-- Create trigger for license usage increment
CREATE TRIGGER on_invitation_created_license
  AFTER INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.increment_license_usage();

-- Create trigger for license usage decrement
CREATE TRIGGER on_invitation_deleted_license
  AFTER DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.decrement_license_usage();

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- You can add any initial data here if needed
-- For example, default courses, sample data, etc.

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- The schema has been successfully created!
-- Your ONEGO Learning application database is now ready.
-- 
-- Next steps:
-- 1. Update your Supabase client configuration in src/integrations/supabase/client.ts
-- 2. Deploy your Supabase Edge Functions (if using them)
-- 3. Test the application functionality 