# Fitness Interval Timer PWA

A Progressive Web App (PWA) for fitness interval training with offline-first support and Supabase synchronization.

## Features

- **Offline-first**: Works completely offline with local data storage
- **PWA Support**: Install on mobile devices like a native app
- **Interval Timer**: Customizable run/walk intervals with visual and audio cues
- **High Contrast Design**: Optimized for outdoor use with bright colors
- **Audio & Vibration**: Sound alerts and haptic feedback for phase changes
- **Session Tracking**: Local storage with cloud sync via Supabase
- **Statistics**: Charts and analytics for workout history
- **Push Notifications**: Optional notifications for workout phases

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: IndexedDB (local) + Supabase (cloud sync)
- **Charts**: Recharts
- **PWA**: Service Worker + Web App Manifest

## Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase** (optional, for cloud sync):
   - Create a Supabase project
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key
   - Create the database schema (see below)

3. **Run the development server**:
   ```bash
   npm run dev
   ```

## Supabase Schema

If you want cloud sync functionality, create this table in your Supabase database:

```sql
-- Create users table (if not using Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create workout sessions table
CREATE TABLE workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  run_time integer NOT NULL,
  walk_time integer NOT NULL,
  rounds integer NOT NULL,
  total_duration integer NOT NULL,
  total_run_time integer NOT NULL,
  total_walk_time integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  date timestamptz DEFAULT now(),
  distance numeric,
  average_pace numeric DEFAULT 0,
  max_speed numeric DEFAULT 0
);

-- Create GPS tracks table
CREATE TABLE gps_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracks ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_gps_tracks_session_id ON gps_tracks(session_id);

-- Policies for workout_sessions
CREATE POLICY "Users can manage their own sessions"
  ON workout_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to insert sessions (for offline-first functionality)
CREATE POLICY "Allow insert for anon users"
  ON workout_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public read access to sessions
CREATE POLICY "Enable read access for all users"
  ON workout_sessions
  FOR SELECT
  TO public
  USING (true);

-- Policies for gps_tracks
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
```

## Usage

1. **Setup**: Enter your desired run time, walk time, and number of rounds
2. **Workout**: Follow the timer with color-coded phases:
   - **Orange/Red**: Running phase
   - **Blue/Teal**: Walking/recovery phase
3. **Controls**: Pause, skip phases, or stop the workout anytime
4. **Stats**: View your workout history and progress charts

## Offline Features

- Fully functional without internet connection
- Local session storage using IndexedDB
- Automatic sync when connection is restored
- Service worker for offline app functionality

## PWA Installation

The app can be installed on mobile devices:
1. Open in mobile browser
2. Tap "Add to Home Screen" or "Install App"
3. Launch from home screen like a native app

## Color Scheme

Optimized for outdoor readability:
- **Run Phase**: Bright orange (#FF5722)
- **Walk Phase**: Strong cyan-blue (#0288D1)
- **Buttons**: Yellow (#FDD835) with black text
- **Text**: High contrast white on dark backgrounds

## Browser Support

- Modern browsers with ES2020 support
- IndexedDB for local storage
- Web Audio API for sounds
- Vibration API for haptic feedback
- Push Notifications API
- Service Workers for PWA functionality
