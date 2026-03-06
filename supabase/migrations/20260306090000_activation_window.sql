ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS activation_started_at TIMESTAMPTZ;

UPDATE public.profiles
SET activation_started_at = COALESCE(activation_started_at, updated_at, created_at)
WHERE is_activated = true
  AND activation_started_at IS NULL;

CREATE OR REPLACE FUNCTION public.activate_account_by_code(code_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code_record RECORD;
    user_p RECORD;
    activation_start TIMESTAMPTZ := now();
    expiry_date TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT * INTO code_record
    FROM public.activation_codes
    WHERE code = code_text AND is_used = false;

    IF NOT FOUND THEN
        SELECT * INTO user_p
        FROM public.profiles
        WHERE user_id = auth.uid() AND activation_code = code_text;

        IF FOUND THEN
            UPDATE public.profiles
            SET is_activated = true,
                activation_started_at = activation_start,
                activation_expires_at = activation_start + interval '30 days'
            WHERE user_id = auth.uid();

            RETURN jsonb_build_object('success', true, 'message', 'Account activated successfully');
        END IF;

        RETURN jsonb_build_object('success', false, 'message', 'Invalid or already used code');
    END IF;

    IF code_record.duration_days = 0 THEN
        expiry_date := NULL;
    ELSE
        expiry_date := activation_start + (code_record.duration_days || ' days')::interval;
    END IF;

    UPDATE public.activation_codes
    SET is_used = true,
        used_by = auth.uid(),
        used_at = activation_start
    WHERE id = code_record.id;

    UPDATE public.profiles
    SET is_activated = true,
        version = code_record.version,
        activation_started_at = activation_start,
        activation_expires_at = expiry_date
    WHERE user_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Account activated for ' || code_record.duration_days || ' days');
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_pro_status(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can revoke status';
    END IF;

    UPDATE public.profiles
    SET version = 'hay',
        is_activated = false,
        activation_started_at = NULL,
        activation_expires_at = NULL
    WHERE user_id = target_user_id;

    RETURN TRUE;
END;
$$;
