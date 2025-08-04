-- Check if courses are being stored in the database

-- 1. Check courses table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'courses'
ORDER BY ordinal_position;

-- 2. Check how many courses exist
SELECT COUNT(*) as total_courses FROM courses;

-- 3. Check recent courses
SELECT 
  id,
  course_title,
  track_type,
  user_id,
  created_at,
  updated_at
FROM courses 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check courses for the specific user
SELECT 
  id,
  course_title,
  track_type,
  creator_id,
  created_at
FROM courses 
WHERE creator_id = '23401d96-3247-40b7-8997-12cdf5301a76'
ORDER BY created_at DESC;

-- 5. Check if there are any courses with null or empty titles
SELECT 
  id,
  course_title,
  track_type,
  creator_id,
  created_at
FROM courses 
WHERE course_title IS NULL OR course_title = ''
ORDER BY created_at DESC;

-- 6. Check the course_plan JSON structure for a recent course
SELECT 
  id,
  course_title,
  course_plan,
  created_at
FROM courses 
WHERE course_plan IS NOT NULL
ORDER BY created_at DESC 
LIMIT 3;

-- 7. Check if there are any errors in the courses table
SELECT 
  id,
  course_title,
  track_type,
  creator_id,
  created_at,
  CASE 
    WHEN course_title IS NULL THEN 'Missing title'
    WHEN course_title = '' THEN 'Empty title'
    WHEN track_type IS NULL THEN 'Missing track type'
    WHEN creator_id IS NULL THEN 'Missing creator_id'
    ELSE 'OK'
  END as status
FROM courses 
ORDER BY created_at DESC 
LIMIT 10; 