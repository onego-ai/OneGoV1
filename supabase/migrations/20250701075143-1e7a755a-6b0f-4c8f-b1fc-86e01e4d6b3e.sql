
-- Change the team column from text to text[] to support multiple teams
ALTER TABLE public.profiles ALTER COLUMN team TYPE text[] USING 
  CASE 
    WHEN team IS NULL THEN ARRAY['General']
    WHEN team = '' THEN ARRAY['General']
    ELSE ARRAY[team]
  END;

-- Set default value for new users
ALTER TABLE public.profiles ALTER COLUMN team SET DEFAULT ARRAY['General'];

-- Update existing NULL or empty teams to have General as default
UPDATE public.profiles 
SET team = ARRAY['General'] 
WHERE team IS NULL OR array_length(team, 1) IS NULL;

-- Create helper functions for team management
CREATE OR REPLACE FUNCTION add_user_to_team(user_id uuid, team_name text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET team = array_append(team, team_name)
  WHERE id = user_id 
  AND NOT (team @> ARRAY[team_name]);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION remove_user_from_team(user_id uuid, team_name text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET team = array_remove(team, team_name)
  WHERE id = user_id;
  
  -- Ensure user always has at least General team
  UPDATE public.profiles 
  SET team = ARRAY['General']
  WHERE id = user_id 
  AND (team IS NULL OR array_length(team, 1) IS NULL OR array_length(team, 1) = 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_team_name(old_name text, new_name text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET team = array_replace(team, old_name, new_name)
  WHERE team @> ARRAY[old_name];
END;
$$ LANGUAGE plpgsql;
