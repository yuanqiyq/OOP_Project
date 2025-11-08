import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseServiceRoleKey } from './supabase.js'

// Create Supabase admin client with service role key
// This client has admin privileges and can delete users
// The service role key should be set in your .env file as VITE_SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

if (!supabaseAdmin) {
  console.warn('⚠️ Supabase Service Role Key not configured. User deletion from Supabase Auth will not work.')
  console.warn('   Please set VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file')
  console.warn('   Get it from: Supabase Dashboard > Settings > API > service_role key')
}

