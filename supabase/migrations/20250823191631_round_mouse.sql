/*
  # Add GPS tracking support to workout sessions

  1. Schema Updates
    - Add `average_pace` (numeric) - minutes per kilometer
    - Add `max_speed` (numeric) - kilometers per hour
    - Update existing `distance` column to ensure it's numeric

  2. New Tables
    - `gps_tracks` table for storing GPS point data
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to workout_sessions)
      - `points` (jsonb) - array of GPS points with lat/lng/timestamp
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on `gps_tracks` table
    - Add policies for authenticated users to manage their own GPS data
*/

-- Add new columns to workout_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sessions' AND column_name = 'average_pace'
  ) THEN
    ALTER TABLE workout_sessions ADD COLUMN average_pace numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sessions' AND column_name = 'max_speed'
  ) THEN
    ALTER TABLE workout_sessions ADD COLUMN max_speed numeric;
  END IF;
END $$;

-- Create GPS tracks table
CREATE TABLE IF NOT EXISTS gps_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gps_tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for GPS tracks
CREATE POLICY "Users can manage their own GPS tracks"
ON gps_tracks
FOR ALL
TO authenticated
USING (
  session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_gps_tracks_session_id 
ON gps_tracks(session_id);