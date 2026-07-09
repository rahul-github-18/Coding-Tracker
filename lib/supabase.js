import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if the URL is valid to prevent build-time crashes with placeholder env variables
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
  if (!key || key === 'your_supabase_service_role_key') {
    return 'placeholder-key';
  }
  return key;
};

export const supabase = createClient(
  getValidUrl(supabaseUrl),
  getValidKey(supabaseKey),
  {
    auth: {
      persistSession: false,
    }
  }
);
