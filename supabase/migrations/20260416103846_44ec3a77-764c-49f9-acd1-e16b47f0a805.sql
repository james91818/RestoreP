
CREATE OR REPLACE FUNCTION public.auto_detect_fake_test_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _name text;
  _email text;
  _phone text;
  _is_test boolean := false;
  _is_fake boolean := false;
BEGIN
  _name  := lower(COALESCE(NEW.full_name, ''));
  _email := lower(COALESCE(NEW.email, ''));
  _phone := COALESCE(NEW.phone, '');

  -- Detect TEST leads: name or email contains "test" anywhere
  IF _name ~ 'test'
     OR _email ~ 'test'
     OR _phone ~ '^(0{5,}|1{5,}|12345|000000)' 
  THEN
    _is_test := true;
  END IF;

  -- Detect FAKE leads (common fake patterns)
  IF NOT _is_test THEN
    IF _name ~ '(^(asdf|qwer|zxcv|aaa|bbb|xxx|yyy|zzz|abc|fgh|jkl|fake|nope|none|na|n\/a|dfg|sdf|fds|gfds|hjk|lkj)$|(.)\2{3,})'
       OR _email ~ '(^(asdf|qwer|zxcv|aaa|bbb|xxx|yyy|zzz|abc|fake|nope|none)@|@(mailinator|guerrillamail|yopmail|tempmail|throwaway|fakeinbox|sharklasers|grr\.la|dispostable|maildrop)\.)'
       OR (_phone <> '' AND _phone ~ '^(\+?0{7,}|0{7,}|1111111|2222222|3333333|9999999)')
       OR (length(_name) <= 2 AND _name <> '')
       OR _name ~ '^[^a-z]*$'
    THEN
      _is_fake := true;
    END IF;
  END IF;

  IF _is_test THEN
    NEW.status := 'Test';
  ELSIF _is_fake THEN
    NEW.status := 'Fake';
  END IF;

  RETURN NEW;
END;
$function$;
