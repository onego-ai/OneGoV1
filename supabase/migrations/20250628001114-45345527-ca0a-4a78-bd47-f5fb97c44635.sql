
-- Add missing company_logo column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN company_logo TEXT;

-- Add missing status column to courses table  
ALTER TABLE public.courses 
ADD COLUMN status TEXT NOT NULL DEFAULT 'live';

-- Create storage bucket for company assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for company assets
CREATE POLICY "Allow public access to company assets" ON storage.objects
FOR ALL USING (bucket_id = 'company-assets');
