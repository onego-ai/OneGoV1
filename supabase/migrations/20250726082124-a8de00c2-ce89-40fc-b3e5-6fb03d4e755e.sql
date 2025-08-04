-- Fix all database functions to have secure search_path to prevent SQL injection
-- This addresses all the "Function Search Path Mutable" security warnings

-- Fix function 1: increment_license_usage
CREATE OR REPLACE FUNCTION public.increment_license_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Increment licenses_used for the inviter's subscription
  UPDATE public.subscribers 
  SET licenses_used = licenses_used + 1,
      updated_at = now()
  WHERE user_id = NEW.inviter_id;
  
  RETURN NEW;
END;
$function$;

-- Fix function 2: decrement_license_usage
CREATE OR REPLACE FUNCTION public.decrement_license_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Decrement licenses_used for the inviter's subscription
  UPDATE public.subscribers 
  SET licenses_used = GREATEST(licenses_used - 1, 0),
      updated_at = now()
  WHERE user_id = OLD.inviter_id;
  
  RETURN OLD;
END;
$function$;

-- Fix function 3: recalculate_license_usage
CREATE OR REPLACE FUNCTION public.recalculate_license_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix function 4: create_admin_group (already has search_path but ensuring it's correct)
CREATE OR REPLACE FUNCTION public.create_admin_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix function 5: handle_invitation_acceptance
CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix function 6: get_inviter_group_id (already has security definer but ensuring search_path)
CREATE OR REPLACE FUNCTION public.get_inviter_group_id(inviter_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT group_id 
  FROM public.profiles 
  WHERE id = inviter_user_id 
  LIMIT 1;
$function$;

-- Fix function 7: set_invitation_group_id
CREATE OR REPLACE FUNCTION public.set_invitation_group_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Automatically set group_id based on inviter's group
  IF NEW.group_id IS NULL AND NEW.inviter_id IS NOT NULL THEN
    NEW.group_id := public.get_inviter_group_id(NEW.inviter_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix function 8: handle_invitation_acceptance_license
CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance_license()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only increment license usage when invitation is accepted (not when created)
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    UPDATE public.subscribers 
    SET licenses_used = licenses_used + 1,
        updated_at = now()
    WHERE user_id = NEW.inviter_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix function 9: cleanup_expired_invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix function 10: recalculate_license_usage_by_group
CREATE OR REPLACE FUNCTION public.recalculate_license_usage_by_group()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update license usage to count actual group members (excluding the admin themselves)
  UPDATE public.subscribers 
  SET licenses_used = (
    SELECT COALESCE(COUNT(*) - 1, 0) -- Subtract 1 to exclude the admin
    FROM public.profiles 
    WHERE group_id = (
      SELECT group_id 
      FROM public.profiles 
      WHERE id = subscribers.user_id
    )
  ),
  updated_at = now()
  WHERE user_id IN (
    SELECT id FROM public.profiles WHERE role = 'Admin'
  );
END;
$function$;

-- Fix function 11: get_current_user_info (already has security definer but ensuring search_path)
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE(user_role app_role, user_group_id uuid)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role, group_id
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$function$;

-- Fix function 12: remove_user_and_cleanup
CREATE OR REPLACE FUNCTION public.remove_user_and_cleanup(user_id_to_remove uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix function 13: create_subscriber_for_new_user
CREATE OR REPLACE FUNCTION public.create_subscriber_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix function 14: add_user_to_team
CREATE OR REPLACE FUNCTION public.add_user_to_team(user_id uuid, team_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET team = array_append(team, team_name)
  WHERE id = user_id 
  AND NOT (team @> ARRAY[team_name]);
END;
$function$;

-- Fix function 15: remove_user_from_team
CREATE OR REPLACE FUNCTION public.remove_user_from_team(user_id uuid, team_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET team = array_remove(team, team_name)
  WHERE id = user_id;
  
  -- Ensure user always has at least General team
  UPDATE public.profiles 
  SET team = ARRAY['General']
  WHERE id = user_id 
  AND (team IS NULL OR array_length(team, 1) IS NULL OR array_length(team, 1) = 0);
END;
$function$;

-- Fix function 16: update_team_name
CREATE OR REPLACE FUNCTION public.update_team_name(old_name text, new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET team = array_replace(team, old_name, new_name)
  WHERE team @> ARRAY[old_name];
END;
$function$;

-- Fix function 17: initialize_honest_box_for_group
CREATE OR REPLACE FUNCTION public.initialize_honest_box_for_group(group_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix function 18: trigger_initialize_honest_box
CREATE OR REPLACE FUNCTION public.trigger_initialize_honest_box()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Initialize HonestBox for the new group
  PERFORM public.initialize_honest_box_for_group(NEW.id);
  RETURN NEW;
END;
$function$;

-- Fix function 19: handle_admin_group_creation (already has search_path but ensuring it's correct)
CREATE OR REPLACE FUNCTION public.handle_admin_group_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix function 20: handle_new_user (already has search_path but ensuring it's correct)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;