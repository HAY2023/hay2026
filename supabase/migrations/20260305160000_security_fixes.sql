
-- SECURITY FIXES MIGRATION

-- 1. Paywall Integrity: Prevent users from updating their own version or activation status directly
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id AND 
    (
        -- Allow updating only display_name and updated_at
        (OLD.version = NEW.version OR NEW.version IS NULL) AND
        (OLD.is_activated = NEW.is_activated OR NEW.is_activated IS NULL) AND
        (OLD.activation_code = NEW.activation_code OR NEW.activation_code IS NULL)
    )
);

-- Actually, a better way is to move sensitive fields to a separate table or just be very strict.
-- Let's re-write it to be safer:
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id AND 
    version IS NOT DISTINCT FROM OLD.version AND
    is_activated IS NOT DISTINCT FROM OLD.is_activated AND
    activation_code IS NOT DISTINCT FROM OLD.activation_code AND
    activation_expires_at IS NOT DISTINCT FROM OLD.activation_expires_at
);

-- 2. Data Privacy: Ensure activation codes are only readable by admins
DROP POLICY IF EXISTS "Users can check codes" ON public.activation_codes;
CREATE POLICY "Users can check codes" ON public.activation_codes 
FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Admin Spoofing: Ensure is_admin flag cannot be set by users
DROP POLICY IF EXISTS "Users can send messages" ON public.support_messages;
CREATE POLICY "Users can send messages" ON public.support_messages 
FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = ticket_id AND support_tickets.user_id = auth.uid())
    AND is_admin = false
);

-- 4. Secure Edge Functions: This is done in the code, but we ensure DB roles are solid.
