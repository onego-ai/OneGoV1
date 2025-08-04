
-- Step 1: Clean up duplicate invitations for jason@onego.ai account
-- Keep only the most recent invitation for each unique email address
WITH duplicate_invitations AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY inviter_id, invitee_email 
           ORDER BY created_at DESC
         ) as rn
  FROM public.invitations 
  WHERE status = 'pending'
    AND inviter_id = '4fca69ac-2d7d-4e22-ae2b-c1d1ab39c920'
)
DELETE FROM public.invitations
WHERE id IN (
  SELECT id FROM duplicate_invitations WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent duplicate pending invitations
ALTER TABLE public.invitations 
ADD CONSTRAINT unique_pending_invitation 
UNIQUE (inviter_id, invitee_email, status);

-- Step 3: Recalculate license usage after cleanup
SELECT public.recalculate_license_usage();
