import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseServiceRoleKey } from './supabase.js'

// Create Supabase admin client with service role key
// This client has admin privileges and can delete users
// NOTE: Replace 'YOUR_SERVICE_ROLE_KEY_HERE' in supabase.js with your actual service role key
// Get it from: Supabase Dashboard > Settings > API > service_role key
export const supabaseAdmin = supabaseServiceRoleKey && supabaseServiceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE'
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

if (!supabaseAdmin) {
  console.warn('⚠️ Supabase Service Role Key not configured. User deletion from Supabase Auth will not work.')
  console.warn('   Please replace YOUR_SERVICE_ROLE_KEY_HERE in supabase.js with your actual service role key')
}

