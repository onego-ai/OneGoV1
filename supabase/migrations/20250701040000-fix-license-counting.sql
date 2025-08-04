
-- Fix license counting to properly include admin in the count
CREATE OR REPLACE FUNCTION public.recalculate_license_usage_by_group()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update license usage to count ALL group members (including the admin)
  UPDATE public.subscribers 
  SET licenses_used = (
    SELECT COALESCE(COUNT(*), 0) -- Count all members, including admin
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
