import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create Supabase client if both URL and key are provided
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export type WorkoutSession = {
  id?: string;
  run_time: number;
  walk_time: number;
  rounds: number;
  total_duration: number;
  total_run_time: number;
  total_walk_time: number;
  distance?: number; // meters
  date: string;
  synced?: 0 | 1; // 0 = unsynced, 1 = synced
};