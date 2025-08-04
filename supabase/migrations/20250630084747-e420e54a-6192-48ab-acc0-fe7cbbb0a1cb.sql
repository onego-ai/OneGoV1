
-- First, let's drop the problematic trigger that's causing the constraint violation
DROP TRIGGER IF EXISTS on_admin_profile_created ON public.profiles;

-- Update the handle_new_user function to properly handle user creation without the circular dependency
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
    'Admin'::app_role,
    'Free'::subscription_plan,
    NEW.raw_user_meta_data->>'company_name'
  );
  RETURN NEW;
END;
$$;

-- Create a separate function to handle group creation after profile is created
CREATE OR REPLACE FUNCTION public.create_admin_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Create trigger for group creation after profile insert
CREATE TRIGGER on_profile_created_create_group
  AFTER INSERT ON public.profiles
  FOR EACH ROW 
  WHEN (NEW.role = 'Admin')
  EXECUTE FUNCTION public.create_admin_group();

-- Update existing Admin users who don't have groups (in case there are any)
DO $$
DECLARE
  admin_record RECORD;
  new_group_id UUID;
BEGIN
  FOR admin_record IN 
    SELECT * FROM public.profiles 
    WHERE role = 'Admin' AND group_id IS NULL
  LOOP
    -- Create a group for each admin without one
    INSERT INTO public.groups (admin_id, group_name)
    VALUES (admin_record.id, COALESCE(admin_record.company_name, admin_record.full_name || '''s Company'))
    RETURNING id INTO new_group_id;
    
    -- Update the admin's profile with the new group
    UPDATE public.profiles 
    SET group_id = new_group_id 
    WHERE id = admin_record.id;
  END LOOP;
END $$;
