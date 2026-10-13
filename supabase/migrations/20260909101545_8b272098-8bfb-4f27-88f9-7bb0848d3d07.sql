-- Prevent clients from editing staff-controlled fields on their own profile
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tampered boolean := false;
BEGIN
  IF auth.uid() IS NULL OR public.has_permission(auth.uid(), 'users.manage') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_lead IS DISTINCT FROM OLD.is_lead
     OR NEW.assigned_agent IS DISTINCT FROM OLD.assigned_agent
     OR NEW.ftd_agent IS DISTINCT FROM OLD.ftd_agent
     OR NEW.affiliate IS DISTINCT FROM OLD.affiliate
     OR NEW.funnel IS DISTINCT FROM OLD.funnel
     OR NEW.account_tier IS DISTINCT FROM OLD.account_tier
     OR NEW.account_type IS DISTINCT FROM OLD.account_type
     OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     OR NEW.first_deposit_at IS DISTINCT FROM OLD.first_deposit_at
     OR NEW.verification_code IS DISTINCT FROM OLD.verification_code
     OR NEW.admin_visible_password IS DISTINCT FROM OLD.admin_visible_password
     OR NEW.shaved_to IS DISTINCT FROM OLD.shaved_to
     OR NEW.shaved_from IS DISTINCT FROM OLD.shaved_from
     OR NEW.original_email IS DISTINCT FROM OLD.original_email
     OR NEW.display_id IS DISTINCT FROM OLD.display_id
     OR NEW.created_via_affiliate_api IS DISTINCT FROM OLD.created_via_affiliate_api
     OR NEW.auto_login_token IS DISTINCT FROM OLD.auto_login_token
     OR NEW.auto_login_expires_at IS DISTINCT FROM OLD.auto_login_expires_at
     OR NEW.pbx_extension IS DISTINCT FROM OLD.pbx_extension
     OR NEW.force_home_redirect IS DISTINCT FROM OLD.force_home_redirect
     OR NEW.force_redirect_url IS DISTINCT FROM OLD.force_redirect_url
     OR NEW.force_chat_open IS DISTINCT FROM OLD.force_chat_open
     OR NEW.being_called IS DISTINCT FROM OLD.being_called
     OR NEW.thomas_notified_at IS DISTINCT FROM OLD.thomas_notified_at
  THEN
    _tampered := true;
  END IF;

  IF _tampered THEN
    NEW.status := OLD.status;
    NEW.is_lead := OLD.is_lead;
    NEW.assigned_agent := OLD.assigned_agent;
    NEW.ftd_agent := OLD.ftd_agent;
    NEW.affiliate := OLD.affiliate;
    NEW.funnel := OLD.funnel;
    NEW.account_tier := OLD.account_tier;
    NEW.account_type := OLD.account_type;
    NEW.kyc_status := OLD.kyc_status;
    NEW.first_deposit_at := OLD.first_deposit_at;
    NEW.verification_code := OLD.verification_code;
    NEW.admin_visible_password := OLD.admin_visible_password;
    NEW.shaved_to := OLD.shaved_to;
    NEW.shaved_from := OLD.shaved_from;
    NEW.original_email := OLD.original_email;
    NEW.display_id := OLD.display_id;
    NEW.created_via_affiliate_api := OLD.created_via_affiliate_api;
    NEW.auto_login_token := OLD.auto_login_token;
    NEW.auto_login_expires_at := OLD.auto_login_expires_at;
    NEW.pbx_extension := OLD.pbx_extension;
    NEW.force_home_redirect := OLD.force_home_redirect;
    NEW.force_redirect_url := OLD.force_redirect_url;
    NEW.force_chat_open := OLD.force_chat_open;
    NEW.being_called := OLD.being_called;
    NEW.thomas_notified_at := OLD.thomas_notified_at;

    INSERT INTO public.activity_log (user_id, action, details)
    VALUES (auth.uid(), 'abuse_profile_tamper', jsonb_build_object('profile_id', OLD.id));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_self_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_self_update();

-- Hide the internal authorisation model from regular clients
DROP POLICY IF EXISTS "Authenticated can read roles" ON public.roles;
CREATE POLICY "Staff can read roles"
ON public.roles FOR SELECT TO authenticated
USING (
  public.has_permission(auth.uid(), 'roles.manage')
  OR public.has_permission(auth.uid(), 'users.manage')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_id = roles.id)
);

DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.permissions;
CREATE POLICY "Staff can read permissions"
ON public.permissions FOR SELECT TO authenticated
USING (
  public.has_permission(auth.uid(), 'roles.manage')
  OR public.has_permission(auth.uid(), 'users.manage')
);

DROP POLICY IF EXISTS "Authenticated can read role_permissions" ON public.role_permissions;
CREATE POLICY "Staff can read role_permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (
  public.has_permission(auth.uid(), 'roles.manage')
  OR public.has_permission(auth.uid(), 'users.manage')
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_id = role_permissions.role_id)
);
