
-- Create table for storing anonymous feedback
CREATE TABLE public.honest_box_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monthly_question TEXT,
  monthly_response TEXT,
  open_feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  month_year TEXT NOT NULL, -- Format: "January 2025"
  status TEXT NOT NULL DEFAULT 'received', -- received, under_review, actioned, not_relevant
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  flagged_inappropriate BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT -- Internal notes for admins
);

-- Create table for admin published updates
CREATE TABLE public.honest_box_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_by UUID REFERENCES auth.users NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track current monthly question
CREATE TABLE public.honest_box_monthly_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  month_year TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.honest_box_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honest_box_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honest_box_monthly_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback (completely anonymous - no user_id stored)
CREATE POLICY "Anyone can submit feedback anonymously" 
  ON public.honest_box_feedback 
  FOR INSERT 
  WITH CHECK (true);

-- Only admins can view and manage feedback
CREATE POLICY "Admins can view all feedback" 
  ON public.honest_box_feedback 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  ));

CREATE POLICY "Admins can update feedback status" 
  ON public.honest_box_feedback 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  ));

-- RLS Policies for updates
CREATE POLICY "Everyone can view published updates" 
  ON public.honest_box_updates 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can create updates" 
  ON public.honest_box_updates 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  ));

CREATE POLICY "Admins can update their own updates" 
  ON public.honest_box_updates 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  ));

CREATE POLICY "Admins can delete updates" 
  ON public.honest_box_updates 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  ));

-- RLS Policies for monthly questions
CREATE POLICY "Everyone can view monthly questions" 
  ON public.honest_box_monthly_questions 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage monthly questions" 
  ON public.honest_box_monthly_questions 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  ));

-- Insert the predefined monthly questions rotation
INSERT INTO public.honest_box_monthly_questions (question, month_year) VALUES
('If you had a magic wand, what''s the first thing you would change at our organisation?', 'January 2025'),
('What''s one thing that would make your time here 10% better?', 'February 2025'),
('Share an idea that could help us all work or learn smarter, not harder.', 'March 2025'),
('What is something our organisation should start doing?', 'April 2025'),
('What is something our organisation should stop doing?', 'May 2025'),
('Describe a recent moment where you felt genuinely proud to be part of this organisation. What made it special?', 'June 2025'),
('What''s a tool, resource, or bit of training you wish you had?', 'July 2025'),
('How can we improve communication between different teams or departments?', 'August 2025'),
('What''s one small, inexpensive change that would have a big impact on your day-to-day?', 'September 2025'),
('What part of our culture do you value the most? How can we build on it?', 'October 2025'),
('Is there any "red tape" or unnecessary process we could simplify or get rid of?', 'November 2025'),
('What''s a challenge you''re facing that leadership might not be aware of?', 'December 2025'),
('How can we better support your professional growth and development here?', 'January 2026'),
('What makes a great day here? How could we have more of them?', 'February 2026'),
('If you were in charge for a day, what would be your top priority for the organisation?', 'March 2026'),
('What''s something positive a colleague or manager did recently that you reckon deserves a shout-out?', 'April 2026'),
('How can we make our physical workspace or digital environment better?', 'May 2026'),
('What''s a skill you have that you feel is being underused?', 'June 2026'),
('What are we getting right that we should do more of?', 'July 2026'),
('What question do you think we should ask next month?', 'August 2026');
