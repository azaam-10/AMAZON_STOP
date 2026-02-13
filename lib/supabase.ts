
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client configuration.
 * To use your own project:
 * 1. Create a project at https://supabase.com
 * 2. Get your URL and Anon Key from Project Settings > API
 * 3. Replace the placeholder values below or set them in your environment.
 */
const supabaseUrl = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) 
  || 'https://placeholder-project-id.supabase.co';

const supabaseAnonKey = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWYiOiJwcm9qZWN0LWlkIn0.placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
