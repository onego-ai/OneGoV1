-- Add updated_at column to courses table
ALTER TABLE public.courses 
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON public.courses 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column(); 