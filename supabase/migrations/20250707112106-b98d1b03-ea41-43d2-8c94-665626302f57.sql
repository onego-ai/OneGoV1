
-- Function to initialize monthly questions for existing groups that don't have them
DO $$
DECLARE
  group_record RECORD;
  question_count INTEGER;
BEGIN
  -- Loop through all groups
  FOR group_record IN SELECT id FROM public.groups LOOP
    -- Check if this group already has monthly questions
    SELECT COUNT(*) INTO question_count
    FROM public.honest_box_monthly_questions
    WHERE group_id = group_record.id;
    
    -- If no questions exist for this group, initialize them
    IF question_count = 0 THEN
      PERFORM public.initialize_honest_box_for_group(group_record.id);
    END IF;
  END LOOP;
END $$;
