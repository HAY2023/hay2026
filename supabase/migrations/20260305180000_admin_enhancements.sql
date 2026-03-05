
-- ADMIN ENHANCEMENTS & SECURITY FIXES

-- 1. Add tos_accepted to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tos_accepted BOOLEAN NOT NULL DEFAULT false;

-- 2. Add duration_days to activation_codes
ALTER TABLE public.activation_codes ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30;

-- 3. Update activate_account_by_code to handle duration
CREATE OR REPLACE FUNCTION public.activate_account_by_code(code_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code_record RECORD;
    user_p RECORD;
    expiry_date TIMESTAMPTZ;
BEGIN
    -- Check authentication
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Find the code
    SELECT * INTO code_record 
    FROM public.activation_codes 
    WHERE code = code_text AND is_used = false;

    IF NOT FOUND THEN
        -- Legacy check
        SELECT * INTO user_p FROM public.profiles WHERE user_id = auth.uid() AND activation_code = code_text;
        
        IF FOUND THEN
            -- Default 30 days for legacy codes if not specified
            UPDATE public.profiles 
            SET is_activated = true, 
                activation_expires_at = now() + interval '30 days'
            WHERE user_id = auth.uid();
            
            RETURN jsonb_build_object('success', true, 'message', 'Account activated successfully');
        ELSE
            RETURN jsonb_build_object('success', false, 'message', 'Invalid or already used code');
        END IF;
    END IF;

    -- Calculate expiry
    expiry_date := now() + (code_record.duration_days || ' days')::interval;

    -- Update code
    UPDATE public.activation_codes 
    SET is_used = true, used_by = auth.uid(), used_at = now() 
    WHERE id = code_record.id;

    -- Update profile
    UPDATE public.profiles 
    SET is_activated = true, 
        version = code_record.version,
        activation_expires_at = expiry_date
    WHERE user_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Account activated for ' || code_record.duration_days || ' days');
END;
$$;

-- 4. Function to delete user permanently
CREATE OR REPLACE FUNCTION public.delete_user_permanently(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check if shooter is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can delete users';
    END IF;

    -- Delete from auth.users (cascades to profiles and other tables)
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$;

-- 5. Function to revoke PRO status
CREATE OR REPLACE FUNCTION public.revoke_pro_status(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if shooter is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can revoke status';
    END IF;

    UPDATE public.profiles 
    SET version = 'hay', 
        is_activated = false, 
        activation_expires_at = NULL 
    WHERE user_id = target_user_id;

    RETURN TRUE;
END;
$$;
