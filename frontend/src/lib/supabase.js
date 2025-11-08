import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ohhoxkloouxkkcuisjrc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oaG94a2xvb3V4a2tjdWlzanJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDgwNzcsImV4cCI6MjA3MzY4NDA3N30.Tu0qTFD7ftqEl76hLe4FkE_mUG9uf8AKgvA32WGZjH4'
// Service Role Key - Get from Supabase Dashboard > Settings > API > service_role key
// WARNING: This key has admin privileges - handle with care!
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oaG94a2xvb3V4a2tjdWlzanJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEwODA3NywiZXhwIjoyMDczNjg0MDc3fQ.ET0gJt4No3pIbGFwGGrYIh1RogyX3rTA4EZZaQ8w948'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export { supabaseUrl, supabaseServiceRoleKey }

