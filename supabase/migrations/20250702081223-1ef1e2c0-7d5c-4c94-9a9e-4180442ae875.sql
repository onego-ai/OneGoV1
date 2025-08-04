
-- Update jason@onego.ai's subscription to show correct license count
UPDATE public.subscribers 
SET licenses_purchased = 10,
    updated_at = now()
WHERE email = 'jason@onego.ai';
