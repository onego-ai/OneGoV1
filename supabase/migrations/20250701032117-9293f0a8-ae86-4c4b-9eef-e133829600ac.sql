
-- Phase 1: Fix RLS Policies for profiles table
-- Add UPDATE policy for admins to modify group members' roles
CREATE POLICY "Admins can update profiles in their group" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.get_current_user_info() AS user_info
      WHERE user_info.user_role = 'Admin'
      AND user_info.user_group_id = profiles.group_id
    )
  );

-- Add DELETE policy for admins to remove group members
CREATE POLICY "Admins can delete profiles in their group" 
  ON public.profiles 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.get_current_user_info() AS user_info
      WHERE user_info.user_role = 'Admin'
      AND user_info.user_group_id = profiles.group_id
    )
    AND id != auth.uid() -- Prevent admins from deleting themselves
  );

-- Phase 2: Create comprehensive user removal function
CREATE OR REPLACE FUNCTION public.remove_user_and_cleanup(user_id_to_remove uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
  DELETE FROM public.user_course_assignments WHERE user_id = user_id_to_remove;
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
