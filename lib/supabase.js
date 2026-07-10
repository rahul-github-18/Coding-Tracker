import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Determine if we are running in the browser
const isBrowser = typeof window !== 'undefined';

// On server-side, prioritize the service role key to bypass RLS.
// On client-side, always use the anon key.
const supabaseKey = isBrowser
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const getValidUrl = (url) => {
  if (!url || url === 'your_supabase_project_url') {
    return 'https://placeholder-project.supabase.co';
  }
  try {
    new URL(url);
    return url;
  } catch {
    return 'https://placeholder-project.supabase.co';
  }
};

const getValidKey = (key) => {
  if (!key || key === 'your_supabase_service_role_key' || key === 'your_supabase_anon_key') {
    return 'placeholder-key';
  }
  return key;
};

export const supabase = createClient(
  getValidUrl(supabaseUrl),
  getValidKey(supabaseKey),
  {
    auth: {
      persistSession: isBrowser, // Save auth session in localStorage in the browser
      detectSessionInUrl: isBrowser,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store'
        });
      }
    }
  }
);
