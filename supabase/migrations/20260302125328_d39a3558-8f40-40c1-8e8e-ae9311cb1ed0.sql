
-- Fix ALL RLS policies: change from RESTRICTIVE to PERMISSIVE
-- Categories
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = created_by);

-- Questions
DROP POLICY IF EXISTS "Users can view own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can insert own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete own questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can view all questions" ON public.questions;

CREATE POLICY "Users can view own questions" ON public.questions FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own questions" ON public.questions FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own questions" ON public.questions FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own questions" ON public.questions FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "Admins can view all questions" ON public.questions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for new users" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow insert for new users" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Game Results
DROP POLICY IF EXISTS "Users can view own results" ON public.game_results;
DROP POLICY IF EXISTS "Users can insert own results" ON public.game_results;
DROP POLICY IF EXISTS "Admins can view all results" ON public.game_results;

CREATE POLICY "Users can view own results" ON public.game_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results" ON public.game_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all results" ON public.game_results FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Activation Codes
DROP POLICY IF EXISTS "Admins can manage codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Users can check codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Users can claim unused codes" ON public.activation_codes;

CREATE POLICY "Admins can manage codes" ON public.activation_codes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can check codes" ON public.activation_codes FOR SELECT USING (true);
CREATE POLICY "Users can claim unused codes" ON public.activation_codes FOR UPDATE USING (is_used = false);

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
