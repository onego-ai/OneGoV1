
-- Add group_id column to honest_box_feedback table
ALTER TABLE public.honest_box_feedback 
ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Add group_id column to honest_box_monthly_questions table
ALTER TABLE public.honest_box_monthly_questions 
ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Add group_id column to honest_box_updates table
ALTER TABLE public.honest_box_updates 
ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Update RLS policies for honest_box_feedback
DROP POLICY IF EXISTS "Anyone can submit feedback anonymously" ON public.honest_box_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.honest_box_feedback;
DROP POLICY IF EXISTS "Admins can update feedback status" ON public.honest_box_feedback;

-- New RLS policies for honest_box_feedback (company-specific)
CREATE POLICY "Anyone can submit feedback for their company" 
  ON public.honest_box_feedback 
  FOR INSERT 
  WITH CHECK (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can view feedback for their company" 
  ON public.honest_box_feedback 
  FOR SELECT 
  USING (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can update feedback status for their company" 
  ON public.honest_box_feedback 
  FOR UPDATE 
  USING (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

-- Update RLS policies for honest_box_monthly_questions
DROP POLICY IF EXISTS "Everyone can view monthly questions" ON public.honest_box_monthly_questions;
DROP POLICY IF EXISTS "Admins can manage monthly questions" ON public.honest_box_monthly_questions;

-- New RLS policies for honest_box_monthly_questions (company-specific)
CREATE POLICY "Users can view monthly questions for their company" 
  ON public.honest_box_monthly_questions 
  FOR SELECT 
  USING (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage monthly questions for their company" 
  ON public.honest_box_monthly_questions 
  FOR ALL 
  USING (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

-- Update RLS policies for honest_box_updates
DROP POLICY IF EXISTS "Everyone can view published updates" ON public.honest_box_updates;
DROP POLICY IF EXISTS "Admins can create updates" ON public.honest_box_updates;
DROP POLICY IF EXISTS "Admins can update their own updates" ON public.honest_box_updates;
DROP POLICY IF EXISTS "Admins can delete updates" ON public.honest_box_updates;

-- New RLS policies for honest_box_updates (company-specific)
CREATE POLICY "Users can view updates for their company" 
  ON public.honest_box_updates 
  FOR SELECT 
  USING (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create updates for their company" 
  ON public.honest_box_updates 
  FOR INSERT 
  WITH CHECK (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can update their own updates for their company" 
  ON public.honest_box_updates 
  FOR UPDATE 
  USING (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can delete updates for their company" 
  ON public.honest_box_updates 
  FOR DELETE 
  USING (
    group_id = (
      SELECT group_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

-- Create function to initialize HonestBox for new companies
CREATE OR REPLACE FUNCTION public.initialize_honest_box_for_group(group_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger to automatically initialize HonestBox when a new group is created
CREATE OR REPLACE FUNCTION public.trigger_initialize_honest_box()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Initialize HonestBox for the new group
  PERFORM public.initialize_honest_box_for_group(NEW.id);
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_group_created ON public.groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_initialize_honest_box();

-- Clean up existing global data (assign to first group or remove)
-- This is a one-time migration to handle existing data
DO $$
DECLARE
  first_group_id UUID;
BEGIN
  -- Get the first group ID
  SELECT id INTO first_group_id FROM public.groups LIMIT 1;
  
  IF first_group_id IS NOT NULL THEN
    -- Assign existing data to the first group
    UPDATE public.honest_box_feedback SET group_id = first_group_id WHERE group_id IS NULL;
    UPDATE public.honest_box_monthly_questions SET group_id = first_group_id WHERE group_id IS NULL;
    UPDATE public.honest_box_updates SET group_id = first_group_id WHERE group_id IS NULL;
  ELSE
    -- If no groups exist, delete the orphaned data
    DELETE FROM public.honest_box_feedback WHERE group_id IS NULL;
    DELETE FROM public.honest_box_monthly_questions WHERE group_id IS NULL;
    DELETE FROM public.honest_box_updates WHERE group_id IS NULL;
  END IF;
END $$;

-- Make group_id NOT NULL after assigning existing data
ALTER TABLE public.honest_box_feedback ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE public.honest_box_monthly_questions ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE public.honest_box_updates ALTER COLUMN group_id SET NOT NULL;
