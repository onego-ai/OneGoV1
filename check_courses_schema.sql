-- Check the actual schema of the courses table

-- 1. Check all columns in the courses table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'courses'
ORDER BY ordinal_position;

-- 2. Check if there's a creator_id column instead
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND (column_name LIKE '%user%' OR column_name LIKE '%creator%' OR column_name LIKE '%author%')
ORDER BY ordinal_position;

-- 3. Check the table structure with more details
SELECT 
  schemaname,
  tablename,
  columnname,
  data_type,
  is_nullable,
  column_default
FROM pg_tables t
JOIN information_schema.columns c ON t.tablename = c.table_name
WHERE tablename = 'courses'
ORDER BY c.ordinal_position;

-- 4. Check if there are any foreign key constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'courses';

-- 5. Check what the courses table actually looks like
\d courses; 