
-- Update courses table to support proper draft/published workflow
ALTER TABLE public.courses 
ALTER COLUMN status SET DEFAULT 'drafted';

-- Update existing courses that are 'live' to 'published' to maintain current functionality
UPDATE public.courses 
SET status = 'published' 
WHERE status = 'live';

-- Add check constraint to ensure only valid statuses
ALTER TABLE public.courses 
ADD CONSTRAINT valid_course_status 
CHECK (status IN ('drafted', 'published', 'processing'));
