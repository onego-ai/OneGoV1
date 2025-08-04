
-- Create session_feedback table to store user feedback after sessions
CREATE TABLE public.session_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
  challenge_rating INTEGER CHECK (challenge_rating >= 1 AND challenge_rating <= 5),
  suggestions TEXT,
  notify_trial BOOLEAN DEFAULT false,
  total_interactions INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  session_duration_minutes INTEGER DEFAULT 0,
  ai_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view their own feedback
CREATE POLICY "Users can view their own session feedback" 
  ON public.session_feedback 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to insert their own feedback
CREATE POLICY "Users can create their own session feedback" 
  ON public.session_feedback 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to update their own feedback
CREATE POLICY "Users can update their own session feedback" 
  ON public.session_feedback 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_session_feedback_user_id ON public.session_feedback(user_id);
CREATE INDEX idx_session_feedback_course_id ON public.session_feedback(course_id);
