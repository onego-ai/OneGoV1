
-- Phase 1: Enable Real-time Updates (Database Level)

-- First, enable REPLICA IDENTITY FULL on both tables to ensure complete row data during updates
ALTER TABLE public.invitations REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add the tables to the supabase_realtime publication to enable real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Phase 2: Fix RLS policies that might be blocking invitation status updates
-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "view_own_invitations" ON public.invitations;
DROP POLICY IF EXISTS "create_invitations" ON public.invitations;

-- Create comprehensive RLS policies for invitations table
CREATE POLICY "Users can view invitations they sent or received" 
  ON public.invitations 
  FOR SELECT 
  USING (
    inviter_id = auth.uid() OR 
    invitee_email = auth.email()
  );

CREATE POLICY "Users can create invitations" 
  ON public.invitations 
  FOR INSERT 
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Users can update invitations they sent or are invited to" 
  ON public.invitations 
  FOR UPDATE 
  USING (
    inviter_id = auth.uid() OR 
    invitee_email = auth.email()
  );

CREATE POLICY "Users can delete invitations they sent" 
  ON public.invitations 
  FOR DELETE 
  USING (inviter_id = auth.uid());

-- Phase 3: Create a function to recalculate license usage based on actual group members
CREATE OR REPLACE FUNCTION public.recalculate_license_usage_by_group()
RETURNS void
LANGUAGE plpgsql
AS $$
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
$$;

-- Run the function to fix current license counts
SELECT public.recalculate_license_usage_by_group();
