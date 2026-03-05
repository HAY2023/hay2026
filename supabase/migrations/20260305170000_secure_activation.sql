
-- SECURE ACTIVATION RPC

CREATE OR REPLACE FUNCTION public.activate_account_by_code(code_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code_record RECORD;
    user_p RECORD;
BEGIN
    -- 1. Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- 2. Find the code
    SELECT * INTO code_record 
    FROM public.activation_codes 
    WHERE code = code_text AND is_used = false;

    IF NOT FOUND THEN
        -- Check if it's assigned to the user profile directly (legacy or manual assignment)
        SELECT * INTO user_p FROM public.profiles WHERE user_id = auth.uid() AND activation_code = code_text;
        
        IF FOUND THEN
            UPDATE public.profiles 
            SET is_activated = true 
            WHERE user_id = auth.uid();
            
            RETURN jsonb_build_object('success', true, 'message', 'Account activated successfully (Profile Code)');
        ELSE
            RETURN jsonb_build_object('success', false, 'message', 'Invalid or already used code');
        END IF;
    END IF;

    -- 3. Mark code as used
    UPDATE public.activation_codes 
    SET is_used = true, used_by = auth.uid(), used_at = now() 
    WHERE id = code_record.id;

    -- 4. Update user profile
    UPDATE public.profiles 
    SET is_activated = true, version = code_record.version 
    WHERE user_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Account activated with version ' || code_record.version);
END;
$$;
