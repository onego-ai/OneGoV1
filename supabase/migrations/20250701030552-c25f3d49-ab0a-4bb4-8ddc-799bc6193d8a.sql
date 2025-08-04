
-- First, let's create a security definer function to get the current user's role and group
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE(user_role app_role, user_group_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role, group_id
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Update the profiles table RLS policies to allow proper group visibility
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new comprehensive policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles in their group" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.get_current_user_info() AS user_info
      WHERE user_info.user_role = 'Admin'
      AND user_info.user_group_id = profiles.group_id
    )
  );

CREATE POLICY "Standard users can view other users in their group" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.get_current_user_info() AS user_info
      WHERE user_info.user_group_id = profiles.group_id
      AND user_info.user_group_id IS NOT NULL
    )
  );
