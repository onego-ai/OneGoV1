
-- Add trigger to automatically increment licenses_used when invitations are created
CREATE OR REPLACE FUNCTION public.increment_license_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment licenses_used for the inviter's subscription
  UPDATE public.subscribers 
  SET licenses_used = licenses_used + 1,
      updated_at = now()
  WHERE user_id = NEW.inviter_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically decrement licenses_used when invitations are deleted
CREATE OR REPLACE FUNCTION public.decrement_license_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement licenses_used for the inviter's subscription
  UPDATE public.subscribers 
  SET licenses_used = GREATEST(licenses_used - 1, 0),
      updated_at = now()
  WHERE user_id = OLD.inviter_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic license usage tracking
CREATE TRIGGER on_invitation_created
  AFTER INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.increment_license_usage();

CREATE TRIGGER on_invitation_deleted
  AFTER DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.decrement_license_usage();

-- Add constraint to prevent over-invitation beyond purchased licenses
ALTER TABLE public.subscribers 
ADD CONSTRAINT check_license_limit 
CHECK (licenses_used <= licenses_purchased);
