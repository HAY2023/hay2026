
-- Create activation_codes table for universal codes
CREATE TABLE public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  version text NOT NULL DEFAULT 'hay',
  is_used boolean NOT NULL DEFAULT false,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage codes" ON public.activation_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Any authenticated user can select (to validate their code)
CREATE POLICY "Users can check codes" ON public.activation_codes
  FOR SELECT TO authenticated
  USING (true);

-- Any authenticated user can update unused codes (to claim them)
CREATE POLICY "Users can claim unused codes" ON public.activation_codes
  FOR UPDATE TO authenticated
  USING (is_used = false);

-- Add version column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS version text DEFAULT 'hay';
