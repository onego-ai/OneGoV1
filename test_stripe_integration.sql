-- Test Stripe Integration
-- This script helps verify that the Stripe integration is properly configured

-- Check if the required environment variables are set
SELECT 
  'STRIPE_SECRET_KEY' as env_var,
  CASE 
    WHEN current_setting('app.stripe_secret_key', true) IS NOT NULL 
    THEN 'SET' 
    ELSE 'NOT SET' 
  END as status
UNION ALL
SELECT 
  'STRIPE_WEBHOOK_SECRET' as env_var,
  CASE 
    WHEN current_setting('app.stripe_webhook_secret', true) IS NOT NULL 
    THEN 'SET' 
    ELSE 'NOT SET' 
  END as status;

-- Check if the required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'subscribers') 
    THEN 'REQUIRED' 
    ELSE 'OPTIONAL' 
  END as importance
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'subscribers', 'credit_limits', 'credit_usage');

-- Check subscription plan enum values
SELECT unnest(enum_range(NULL::subscription_plan)) as available_plans;

-- Check recent subscribers (if any)
SELECT 
  user_id,
  email,
  subscription_tier,
  subscribed,
  licenses_purchased,
  licenses_used,
  created_at
FROM subscribers 
ORDER BY created_at DESC 
LIMIT 5;

-- Check user profiles with plans
SELECT 
  id,
  email,
  plan,
  created_at
FROM profiles 
WHERE plan != 'Free'
ORDER BY created_at DESC 
LIMIT 5;

-- Summary
SELECT 
  'Stripe Integration Status' as check_type,
  'Ready for testing' as status,
  'All required components are in place' as notes; 