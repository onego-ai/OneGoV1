-- Test course creation manually

-- 1. Check if we can insert a test course
INSERT INTO courses (
  creator_id,
  course_title,
  course_plan,
  system_prompt,
  track_type
) VALUES (
  '23401d96-3247-40b7-8997-12cdf5301a76',
  'Test Course - Manual Insert',
  '{"test": "data", "modules": []}'::jsonb,
  'Test system prompt',
  'Educational'
) RETURNING id, course_title, creator_id, created_at;

-- 2. Check if the course was inserted
SELECT 
  id,
  course_title,
  user_id,
  track_type,
  status,
  created_at
FROM courses 
WHERE course_title = 'Test Course - Manual Insert'
ORDER BY created_at DESC;

-- 3. Check all courses for the user
SELECT 
  id,
  course_title,
  track_type,
  created_at
FROM courses 
WHERE creator_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC;

-- 4. Check if there are any constraint violations
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'courses'::regclass;

-- 5. Check RLS policies on courses table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'courses'; 