
-- Add missing foreign key constraints for session_feedback table
ALTER TABLE public.session_feedback 
ADD CONSTRAINT fk_session_feedback_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.session_feedback 
ADD CONSTRAINT fk_session_feedback_course_id 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Add missing foreign key constraints for other tables that need them
ALTER TABLE public.course_assignments 
ADD CONSTRAINT fk_course_assignments_course_id 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.course_assignments 
ADD CONSTRAINT fk_course_assignments_group_id 
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.courses 
ADD CONSTRAINT fk_courses_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.groups 
ADD CONSTRAINT fk_groups_admin_id 
FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_performance 
ADD CONSTRAINT fk_user_performance_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_performance 
ADD CONSTRAINT fk_user_performance_course_id 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
