
-- Create individual course assignments table to track personal assignments
CREATE TABLE public.individual_course_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_to_team text,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'assigned',
  UNIQUE(user_id, course_id)
);

-- Add Row Level Security
ALTER TABLE public.individual_course_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for individual course assignments
CREATE POLICY "Users can view their own assignments" 
  ON public.individual_course_assignments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view assignments in their group" 
  ON public.individual_course_assignments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = user_id 
      AND p1.role = 'Admin' 
      AND p1.group_id = p2.group_id
    )
  );

CREATE POLICY "Admins can create assignments for their group members" 
  ON public.individual_course_assignments 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = assigned_by 
    AND EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = user_id 
      AND p1.role = 'Admin' 
      AND p1.group_id = p2.group_id
    )
  );

CREATE POLICY "Admins can update assignments for their group members" 
  ON public.individual_course_assignments 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = user_id 
      AND p1.role = 'Admin' 
      AND p1.group_id = p2.group_id
    )
  );

CREATE POLICY "Admins can delete assignments for their group members" 
  ON public.individual_course_assignments 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = user_id 
      AND p1.role = 'Admin' 
      AND p1.group_id = p2.group_id
    )
  );
