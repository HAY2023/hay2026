
CREATE POLICY "Users can update own purchases" ON public.user_purchases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchases" ON public.user_purchases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
