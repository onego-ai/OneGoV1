
-- Add foreign key constraints to individual_course_assignments table
ALTER TABLE public.individual_course_assignments 
ADD CONSTRAINT individual_course_assignments_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.individual_course_assignments 
ADD CONSTRAINT individual_course_assignments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.individual_course_assignments 
ADD CONSTRAINT individual_course_assignments_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
