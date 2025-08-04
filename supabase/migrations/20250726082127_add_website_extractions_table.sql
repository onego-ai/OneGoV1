-- Create website_extractions table
CREATE TABLE IF NOT EXISTS public.website_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  website_url TEXT NOT NULL,
  extracted_content TEXT NOT NULL,
  prompt_used TEXT NOT NULL,
  search_query TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_extractions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own website extractions" ON public.website_extractions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own website extractions" ON public.website_extractions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own website extractions" ON public.website_extractions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own website extractions" ON public.website_extractions
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_website_extractions_user_id ON public.website_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_website_extractions_processed_at ON public.website_extractions(processed_at);
CREATE INDEX IF NOT EXISTS idx_website_extractions_website_url ON public.website_extractions(website_url); 