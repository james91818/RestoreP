-- Re-create the trigger that creates a profile when a new auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix the orphaned shaved user by inserting their profile
INSERT INTO public.profiles (id, email, full_name, phone, country, status, is_lead, assigned_agent, kyc_status)
SELECT 
  'aaaa4bd6-72d8-4abe-b8fd-1813a68523e6',
  u.email,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'phone',
  u.raw_user_meta_data->>'country',
  'New Registration',
  true,
  (SELECT assigned_agent FROM profiles WHERE id = '0950ff72-32e5-4c6d-8d48-d2d1eb4be347'),
  (SELECT kyc_status FROM profiles WHERE id = '0950ff72-32e5-4c6d-8d48-d2d1eb4be347')
FROM auth.users u
WHERE u.id = 'aaaa4bd6-72d8-4abe-b8fd-1813a68523e6'
ON CONFLICT (id) DO NOTHING;