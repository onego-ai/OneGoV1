
-- Remove the duplicate foreign key constraint that's causing the ambiguity
ALTER TABLE public.user_performance 
DROP CONSTRAINT IF EXISTS fk_user_performance_course_id;

-- Keep only the original Supabase-generated constraint: user_performance_course_id_fkey
