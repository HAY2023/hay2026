
-- Fix ALL RESTRICTIVE policies to PERMISSIVE

-- CATEGORIES
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = created_by);

-- QUESTIONS
DROP POLICY IF EXISTS "Users can view own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can insert own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete own questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can view all questions" ON public.questions;

CREATE POLICY "Users can view own questions" ON public.questions FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own questions" ON public.questions FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own questions" ON public.questions FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own questions" ON public.questions FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "Admins can view all questions" ON public.questions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for new users" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow insert for new users" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- GAME_RESULTS
DROP POLICY IF EXISTS "Users can view own results" ON public.game_results;
DROP POLICY IF EXISTS "Users can insert own results" ON public.game_results;
DROP POLICY IF EXISTS "Admins can view all results" ON public.game_results;

CREATE POLICY "Users can view own results" ON public.game_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results" ON public.game_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all results" ON public.game_results FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- SUPPORT TICKETS
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage tickets" ON public.support_tickets;

CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage tickets" ON public.support_tickets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SUPPORT MESSAGES
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can manage messages" ON public.support_messages;

CREATE POLICY "Users can view ticket messages" ON public.support_messages FOR SELECT USING (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()));
CREATE POLICY "Users can send messages" ON public.support_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()));
CREATE POLICY "Admins can manage messages" ON public.support_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ACTIVATION_CODES
DROP POLICY IF EXISTS "Admins can manage codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Users can check codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Users can claim unused codes" ON public.activation_codes;

CREATE POLICY "Admins can manage codes" ON public.activation_codes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can check codes" ON public.activation_codes FOR SELECT USING (true);
CREATE POLICY "Users can claim unused codes" ON public.activation_codes FOR UPDATE USING (is_used = false);

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
