import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://sitwoequuqpmhsehwcxi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdHdvZXF1dXFwbWhzZWh3Y3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MDM5MTUsImV4cCI6MjA2MTA3OTkxNX0.aAl6ucURRwuX7eloTYN5n_B5bqjlaFGelF7nO6eo_zM';
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});