
-- First, let's ensure the invitations table has proper group_id handling
-- and fix any missing indexes or constraints

-- Add index for better performance on invitation lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(magic_link_token);
CREATE INDEX IF NOT EXISTS idx_invitations_group_inviter ON public.invitations(group_id, inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires ON public.invitations(status, expires_at);

-- Update the invitations table to ensure group_id is properly set
-- (This column should already exist based on the schema, but let's make sure it's not nullable for new invitations)

-- Add a function to get group_id from inviter_id
CREATE OR REPLACE FUNCTION public.get_inviter_group_id(inviter_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT group_id 
  FROM public.profiles 
  WHERE id = inviter_user_id 
  LIMIT 1;
$$;

-- Create a trigger to automatically set group_id when invitation is created
CREATE OR REPLACE FUNCTION public.set_invitation_group_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Automatically set group_id based on inviter's group
  IF NEW.group_id IS NULL AND NEW.inviter_id IS NOT NULL THEN
    NEW.group_id := public.get_inviter_group_id(NEW.inviter_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_set_invitation_group_id ON public.invitations;
CREATE TRIGGER trigger_set_invitation_group_id
  BEFORE INSERT ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invitation_group_id();

-- Update license management to only count on acceptance, not creation
-- Remove the existing increment trigger and replace with acceptance-based counting
DROP TRIGGER IF EXISTS trigger_increment_license_usage ON public.invitations;

-- Create new trigger for license management on acceptance
CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance_license()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

CREATE TRIGGER trigger_handle_invitation_acceptance_license
  AFTER UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_acceptance_license();

-- Add cleanup function for expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
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
