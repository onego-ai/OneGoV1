-- Revert the handle_new_user function to default to Admin role for new signups
-- This restores the "Start new trial" flow while keeping invitation overrides working
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
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'Admin'::app_role), -- Default to Admin, allow override for invitations
    'Free'::subscription_plan,
    NEW.raw_user_meta_data->>'company_name'
  );
  RETURN NEW;
END;
$$;