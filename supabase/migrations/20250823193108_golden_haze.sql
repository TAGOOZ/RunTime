/*
  # Fix GPS tracks RLS policy

  1. Security Updates
    - Update RLS policy for gps_tracks table to allow proper access
    - Ensure users can insert GPS tracks for their own workout sessions
    - Allow anonymous users to insert GPS tracks (for offline-first functionality)

  2. Changes
    - Drop existing restrictive policy
    - Add new policies for authenticated and anonymous users
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their own GPS tracks" ON gps_tracks;

-- Create policy for authenticated users
CREATE POLICY "Users can manage their own GPS tracks"
  ON gps_tracks
  FOR ALL
  TO authenticated
  USING (session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = auth.uid()
  ))
  WITH CHECK (session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = auth.uid()
  ));

-- Allow anonymous users to insert GPS tracks (for offline-first functionality)
CREATE POLICY "Allow insert for anon users"
  ON gps_tracks
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public read access to GPS tracks
CREATE POLICY "Enable read access for all users"
  ON gps_tracks
  FOR SELECT
  TO public
  USING (true);