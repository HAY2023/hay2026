
-- Allow all authenticated users to view all profiles (for leaderboard)
CREATE POLICY "Users can view all profiles for leaderboard" ON public.profiles
  FOR SELECT TO authenticated USING (true);
