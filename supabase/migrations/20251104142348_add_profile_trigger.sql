/*
  # Add automatic profile creation trigger
  
  1. Changes
    - Create function to automatically create profile when user signs up
    - Create trigger on auth.users to call this function
    - Ensures every authenticated user has a profile entry
    
  2. Notes
    - Profile is created with default org
    - Role defaults to 'admin'
    - Trigger fires AFTER INSERT on auth.users
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM orgs ORDER BY created_at ASC LIMIT 1;
  
  INSERT INTO public.profiles (id, org_id, role)
  VALUES (NEW.id, default_org_id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();