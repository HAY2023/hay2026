CREATE OR REPLACE FUNCTION public.delete_user_permanently(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND auth.uid() != target_user_id THEN
        RAISE EXCEPTION 'You do not have permission to delete this account.';
    END IF;

    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_permanently(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
