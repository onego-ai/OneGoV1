
-- First, let's check if there are any existing questions and clean up
DELETE FROM public.honest_box_monthly_questions;

-- Drop the existing unique constraint on month_year (if it exists)
ALTER TABLE public.honest_box_monthly_questions 
DROP CONSTRAINT IF EXISTS honest_box_monthly_questions_month_year_key;

-- Add a proper unique constraint on group_id and month_year combination
ALTER TABLE public.honest_box_monthly_questions 
ADD CONSTRAINT honest_box_monthly_questions_group_month_unique 
UNIQUE (group_id, month_year);

-- Now re-initialize monthly questions for all existing groups
DO $$
DECLARE
  group_record RECORD;
BEGIN
  -- Loop through all groups and initialize their monthly questions
  FOR group_record IN SELECT id FROM public.groups LOOP
    PERFORM public.initialize_honest_box_for_group(group_record.id);
  END LOOP;
END $$;
