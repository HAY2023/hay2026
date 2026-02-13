
-- Add created_by column to questions table
ALTER TABLE public.questions ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old RLS policies on questions
DROP POLICY IF EXISTS "Activated users can view questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

-- Users can view only their own questions
CREATE POLICY "Users can view own questions"
ON public.questions
FOR SELECT
USING (auth.uid() = created_by);

-- Users can insert their own questions
CREATE POLICY "Users can insert own questions"
ON public.questions
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can delete their own questions
CREATE POLICY "Users can delete own questions"
ON public.questions
FOR DELETE
USING (auth.uid() = created_by);

-- Users can update their own questions
CREATE POLICY "Users can update own questions"
ON public.questions
FOR UPDATE
USING (auth.uid() = created_by);

-- Admins can view all questions (for admin oversight)
CREATE POLICY "Admins can view all questions"
ON public.questions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow users to manage their own categories
-- Add created_by to categories
ALTER TABLE public.categories ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;

-- Users can view their own categories
CREATE POLICY "Users can view own categories"
ON public.categories
FOR SELECT
USING (auth.uid() = created_by);

-- Users can insert own categories
CREATE POLICY "Users can insert own categories"
ON public.categories
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can delete own categories
CREATE POLICY "Users can delete own categories"
ON public.categories
FOR DELETE
USING (auth.uid() = created_by);

-- Users can update own categories
CREATE POLICY "Users can update own categories"
ON public.categories
FOR UPDATE
USING (auth.uid() = created_by);
