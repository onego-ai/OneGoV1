
-- Drop the existing policy that checks the wrong table
DROP POLICY IF EXISTS "Users can view assigned courses" ON public.courses;

-- Create the correct policy that checks individual_course_assignments
CREATE POLICY "Users can view assigned courses" 
  ON public.courses 
  FOR SELECT 
  USING (
    -- Course creators can see their own courses
    creator_id = auth.uid() 
    OR 
    -- Users can see courses assigned to them individually
    id IN (
      SELECT course_id 
      FROM public.individual_course_assignments 
      WHERE user_id = auth.uid()
    )
  );
