-- Fix the handle_new_user function to create Standard users by default
-- since most new signups will be via invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, plan, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'Standard'::app_role), -- Default to Standard, allow override
    'Free'::subscription_plan,
    NEW.raw_user_meta_data->>'company_name'
  );
  RETURN NEW;
END;
$$;

-- Ensure the basic RLS policy allows users to always view their own profile
-- regardless of group membership status
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Also ensure users can always update their own profile (needed for group assignment)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);