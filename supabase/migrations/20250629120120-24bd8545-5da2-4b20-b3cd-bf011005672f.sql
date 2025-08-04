
-- Add team column to profiles table
ALTER TABLE public.profiles ADD COLUMN team TEXT;

-- Add index for better performance when querying by team
CREATE INDEX idx_profiles_team ON public.profiles(team);

-- Update existing profiles to have 'General' as default team for non-admin users
UPDATE public.profiles 
SET team = NULL 
WHERE role = 'Admin';

-- Standard users get assigned to 'General' team by default
UPDATE public.profiles 
SET team = 'General' 
WHERE role = 'Standard' AND team IS NULL;
