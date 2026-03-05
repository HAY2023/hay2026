
-- FINAL SECURITY HARDENING: SUPPORT MESSAGES & TICKETS RLS

-- 1. Support Tickets: Users can only see their own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets" ON public.support_tickets 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2. Support Messages: Users can only see messages for their own tickets
DROP POLICY IF EXISTS "Users can view own messages" ON public.support_messages;
CREATE POLICY "Users can view own messages" ON public.support_messages 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = ticket_id AND support_tickets.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
);

-- 3. Profiles: Strict selection (already mostly done, but ensuring)
DROP POLICY IF EXISTS "Profiles are readable by owner and admin" ON public.profiles;
CREATE POLICY "Profiles are readable by owner and admin" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. Notification Cleanup
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
