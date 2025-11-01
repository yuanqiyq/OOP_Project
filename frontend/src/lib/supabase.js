import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ohhoxkloouxkkcuisjrc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oaG94a2xvb3V4a2tjdWlzanJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDgwNzcsImV4cCI6MjA3MzY4NDA3N30.Tu0qTFD7ftqEl76hLe4FkE_mUG9uf8AKgvA32WGZjH4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

