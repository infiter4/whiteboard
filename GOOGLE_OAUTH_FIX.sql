-- ============================================
-- COMPREHENSIVE GOOGLE OAUTH FIX
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- 1. ENSURE PROFILES TABLE HAS CORRECT STRUCTURE
-- ============================================
ALTER TABLE public.profiles 
  ALTER COLUMN username DROP NOT NULL;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'website') THEN
    ALTER TABLE public.profiles ADD COLUMN website TEXT;
  END IF;
END $$;

-- 2. FIX EXISTING PROFILES WITH NULL USERNAMES
-- ============================================
-- Update profiles that have NULL or empty usernames
UPDATE public.profiles 
SET username = COALESCE(
  full_name,
  'user_' || substring(id::text, 1, 8)
)
WHERE username IS NULL OR username = '';

-- Now make username NOT NULL again
ALTER TABLE public.profiles 
  ALTER COLUMN username SET NOT NULL;

-- 3. DROP ALL EXISTING RLS POLICIES ON PROFILES
-- ============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 4. CREATE CORRECT RLS POLICIES FOR PROFILES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read all profiles (needed for collaborators)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. FIX WHITEBOARD_COLLABORATORS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view collaborators" ON public.whiteboard_collaborators;
DROP POLICY IF EXISTS "Users can manage collaborators" ON public.whiteboard_collaborators;
DROP POLICY IF EXISTS "Whiteboard owners can manage collaborators" ON public.whiteboard_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for their whiteboards" ON public.whiteboard_collaborators;
DROP POLICY IF EXISTS "Whiteboard owners can add collaborators" ON public.whiteboard_collaborators;
DROP POLICY IF EXISTS "Whiteboard owners can remove collaborators" ON public.whiteboard_collaborators;

ALTER TABLE public.whiteboard_collaborators ENABLE ROW LEVEL SECURITY;

-- View collaborators
CREATE POLICY "Users can view collaborators for accessible whiteboards"
ON public.whiteboard_collaborators
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.whiteboards 
    WHERE whiteboards.id = whiteboard_collaborators.whiteboard_id 
    AND (whiteboards.owner_id = auth.uid() OR whiteboards.access_level = 'public')
  )
  OR user_id = auth.uid()
);

-- Add collaborators (only owners)
CREATE POLICY "Whiteboard owners can add collaborators"
ON public.whiteboard_collaborators
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whiteboards 
    WHERE whiteboards.id = whiteboard_collaborators.whiteboard_id 
    AND whiteboards.owner_id = auth.uid()
  )
);

-- Remove collaborators (only owners)
CREATE POLICY "Whiteboard owners can remove collaborators"
ON public.whiteboard_collaborators
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.whiteboards 
    WHERE whiteboards.id = whiteboard_collaborators.whiteboard_id 
    AND whiteboards.owner_id = auth.uid()
  )
);

-- 6. FIX WHITEBOARDS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own whiteboards" ON public.whiteboards;
DROP POLICY IF EXISTS "Users can insert their own whiteboards" ON public.whiteboards;
DROP POLICY IF EXISTS "Users can update their own whiteboards" ON public.whiteboards;
DROP POLICY IF EXISTS "Users can delete their own whiteboards" ON public.whiteboards;
DROP POLICY IF EXISTS "Users can view public whiteboards" ON public.whiteboards;
DROP POLICY IF EXISTS "Users can view shared whiteboards" ON public.whiteboards;

ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;

-- View whiteboards (own, public, or collaborating on)
CREATE POLICY "Users can view accessible whiteboards"
ON public.whiteboards
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR access_level = 'public'
  OR EXISTS (
    SELECT 1 FROM public.whiteboard_collaborators
    WHERE whiteboard_collaborators.whiteboard_id = whiteboards.id
    AND whiteboard_collaborators.user_id = auth.uid()
  )
);

-- Insert whiteboards
CREATE POLICY "Users can create whiteboards"
ON public.whiteboards
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Update whiteboards (only owners)
CREATE POLICY "Users can update own whiteboards"
ON public.whiteboards
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Delete whiteboards (only owners)
CREATE POLICY "Users can delete own whiteboards"
ON public.whiteboards
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- 7. FIX NOTES TABLE POLICIES (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own notes" ON public.notes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own notes" ON public.notes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes';
    
    EXECUTE 'ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Users can manage own notes" ON public.notes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- 8. CREATE A FUNCTION TO AUTO-CREATE PROFILES (TRIGGER)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_color TEXT;
  new_username TEXT;
BEGIN
  -- Generate random color
  random_color := (ARRAY['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'])[floor(random() * 6 + 1)];
  
  -- Generate username from metadata or email
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'user_' || substring(NEW.id::text, 1, 8)
  );
  
  -- Insert profile
  INSERT INTO public.profiles (id, username, full_name, avatar_url, user_color, updated_at)
  VALUES (
    NEW.id,
    new_username,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    random_color,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to auto-create profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. VERIFY AND REPORT
-- ============================================
SELECT 
  'Profiles with usernames: ' || COUNT(*) as status
FROM public.profiles 
WHERE username IS NOT NULL AND username != '';

SELECT 
  'Profiles without usernames: ' || COUNT(*) as status
FROM public.profiles 
WHERE username IS NULL OR username = '';

-- Done!
SELECT '✅ Google OAuth fix complete!' as status;
