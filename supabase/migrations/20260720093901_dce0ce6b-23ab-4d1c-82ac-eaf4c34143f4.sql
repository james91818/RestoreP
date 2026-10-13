-- Fix typo in agent email and reset password
UPDATE auth.users
SET email = 'felix.leitner@crypto-boerse.com',
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', 'felix.leitner@crypto-boerse.com'),
    encrypted_password = crypt('ADMINadmin2020!', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = 'b127adf1-2268-4bdd-a811-1be8dfe11db3';

UPDATE public.profiles
SET email = 'felix.leitner@crypto-boerse.com'
WHERE id = 'b127adf1-2268-4bdd-a811-1be8dfe11db3';