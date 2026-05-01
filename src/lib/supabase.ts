import { createClient } from '@supabase/supabase-js';

// Access variables with multiple fallbacks for different environments
const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL || process.env?.PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Supabase credentials (URL or Key) are missing from .env!');
}

// Initialize client. If keys are missing, it will return a dummy object that logs a helpful error
// instead of crashing with "Cannot read properties of null".
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : {
      from: () => {
        throw new Error('Supabase Client is not initialized. Please check your .env file and RESTART your dev server.');
      }
    } as any;
