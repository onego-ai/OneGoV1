-- Create pdf_extractions table
CREATE TABLE IF NOT EXISTS public.pdf_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_filename TEXT NOT NULL,
  extracted_content TEXT NOT NULL,
  prompt_used TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_extractions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own PDF extractions" ON public.pdf_extractions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDF extractions" ON public.pdf_extractions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDF extractions" ON public.pdf_extractions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDF extractions" ON public.pdf_extractions
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_user_id ON public.pdf_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_processed_at ON public.pdf_extractions(processed_at); 