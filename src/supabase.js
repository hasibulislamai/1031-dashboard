import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export const SUPER_ADMIN_EMAIL = 'hxb2693894@gmail.com';
export const N8N_BASE = 'https://n8n.diptyai.com/webhook';

export const PLANS = {
  basic: { name: 'Basic', price: 97, client_limit: 10, white_label: false, custom_logo: false, custom_color: false, api_access: false },
  pro: { name: 'Pro', price: 297, client_limit: 500, white_label: true, custom_logo: true, custom_color: true, api_access: true },
  enterprise: { name: 'Enterprise', price: 997, client_limit: 999999, white_label: true, custom_logo: true, custom_color: true, api_access: true },
};
