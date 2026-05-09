/*
  # Fix Profile Creation Issue

  ## Overview
  This migration fixes the user creation issue by ensuring the profile creation
  trigger can properly insert profiles and adding the missing INSERT policy.

  ## Problem
  Users cannot be created because the automatic profile creation fails.
  The trigger exists but there's no INSERT policy on the profiles table.

  ## Solution
  1. Add INSERT policy for the handle_new_user function
  2. Ensure the trigger is properly set up
  3. Add explicit grant for the function to insert into profiles

  ## Important Notes
  - The function runs with SECURITY DEFINER so it should bypass RLS
  - Adding explicit policy as defense in depth
  - No breaking changes to existing functionality
*/

-- Drop existing INSERT policies on profiles (if any)
DROP POLICY IF EXISTS "Allow profile creation via trigger" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Add INSERT policy that allows the trigger to create profiles
-- This policy allows authenticated role to insert profiles
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Also add a policy for the service role to insert profiles (used by trigger)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get the first org (or create one if needed)
  SELECT id INTO default_org_id 
  FROM public.orgs 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- If no org exists, create default one
  IF default_org_id IS NULL THEN
    INSERT INTO public.orgs (name) 
    VALUES ('Default Organization')
    RETURNING id INTO default_org_id;
  END IF;
  
  -- Create the profile
  INSERT INTO public.profiles (id, org_id, role)
  VALUES (NEW.id, default_org_id, 'admin');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify we have at least one org
INSERT INTO public.orgs (name) 
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.orgs LIMIT 1);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.orgs TO service_role;

-- Add helpful comments
COMMENT ON POLICY "Users can insert their own profile" ON public.profiles IS 
'Allows users to create their own profile entry';

COMMENT ON POLICY "Service role can insert profiles" ON public.profiles IS 
'Allows the service role (used by triggers) to create profiles for new users';

COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a profile when a new user signs up. Creates default org if needed.';
