
-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('Admin', 'Standard');

-- Create subscription plans enum  
CREATE TYPE public.subscription_plan AS ENUM ('Free', 'Pro', 'Enterprise');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_name TEXT,
  role app_role NOT NULL DEFAULT 'Admin',
  plan subscription_plan NOT NULL DEFAULT 'Free',
  group_id UUID,
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

-- Add foreign key constraint for group_id in profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_group 
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

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

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'Admin'::app_role,
    'Free'::subscription_plan
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
