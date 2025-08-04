
-- Step 1: Remove the constraint temporarily to allow cleanup
ALTER TABLE public.subscribers 
DROP CONSTRAINT IF EXISTS check_license_limit;

-- Step 2: Create a function to recalculate license usage based on actual pending invitations
CREATE OR REPLACE FUNCTION public.recalculate_license_usage()
RETURNS void
LANGUAGE plpgsql
AS $$
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
$$;

-- Step 3: Execute the recalculation
SELECT public.recalculate_license_usage();

-- Step 4: Clean up excess invitations (keep only the most recent ones within license limits)
WITH excess_invitations AS (
  SELECT i.id
  FROM public.invitations i
  JOIN public.subscribers s ON i.inviter_id = s.user_id
  WHERE i.status = 'pending'
  AND (
    SELECT COUNT(*)
    FROM public.invitations i2
    WHERE i2.inviter_id = i.inviter_id
    AND i2.status = 'pending'
    AND i2.created_at >= i.created_at
  ) > s.licenses_purchased
)
DELETE FROM public.invitations
WHERE id IN (SELECT id FROM excess_invitations);

-- Step 5: Recalculate again after cleanup
SELECT public.recalculate_license_usage();

-- Step 6: Re-add the constraint
ALTER TABLE public.subscribers 
ADD CONSTRAINT check_license_limit 
CHECK (licenses_used <= licenses_purchased);
