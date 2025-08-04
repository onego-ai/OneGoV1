
-- First, let's add a trigger to automatically create a group when an Admin signs up
CREATE OR REPLACE FUNCTION public.handle_admin_group_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create a group if the user is an Admin and doesn't already have a group_id
  IF NEW.role = 'Admin' AND NEW.group_id IS NULL THEN
    -- Create a new group for the admin
    INSERT INTO public.groups (admin_id, group_name)
    VALUES (NEW.id, COALESCE(NEW.company_name, NEW.full_name || '''s Company'))
    RETURNING id INTO NEW.group_id;
    
    -- Update the profile with the new group_id (this will be handled by the UPDATE trigger)
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new user profiles
CREATE OR REPLACE TRIGGER on_admin_profile_created
  BEFORE INSERT ON public.profiles
  FOR EACH ROW 
  WHEN (NEW.role = 'Admin')
  EXECUTE FUNCTION public.handle_admin_group_creation();

-- Update existing Admin users who don't have groups
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

-- Add a table for tracking individual course assignments to users
CREATE TABLE IF NOT EXISTS public.user_course_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'assigned',
  UNIQUE(user_id, course_id)
);

-- Enable RLS on the new table
ALTER TABLE public.user_course_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for user_course_assignments
CREATE POLICY "Users can view their own assignments" 
  ON public.user_course_assignments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage assignments for their group" 
  ON public.user_course_assignments 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin' 
      AND group_id IN (
        SELECT group_id FROM public.profiles WHERE id = user_course_assignments.user_id
      )
    )
  );
