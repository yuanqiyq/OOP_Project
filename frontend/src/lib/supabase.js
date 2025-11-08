import { createClient } from '@supabase/supabase-js'

// Get Supabase configuration from environment variables
// Make sure to create a .env file in the frontend directory with these variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ohhoxkloouxkkcuisjrc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oaG94a2xvb3V4a2tjdWlzanJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDgwNzcsImV4cCI6MjA3MzY4NDA3N30.Tu0qTFD7ftqEl76hLe4FkE_mUG9uf8AKgvA32WGZjH4'
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase URL or Anon Key not configured. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export { supabaseUrl, supabaseServiceRoleKey }

