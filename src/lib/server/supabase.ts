/**
 * ShieldByte — Server-side Supabase Client
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY for full write access (server-only).
 * 
 * HOW TO GET THE SERVICE ROLE KEY:
 * 1. Go to https://supabase.com → open your project
 * 2. Click ⚙️ Project Settings → API
 * 3. Scroll to "service_role" section (below the anon key)
 * 4. Click the 👁️ eye icon to reveal it → copy it
 * 5. Paste it into your .env as SUPABASE_SERVICE_ROLE_KEY
 * 
 * ⚠️ The "Publishable Key" (anon key) will NOT work for inserts
 *    when RLS is enabled. You need the service_role key.
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error(
		'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
		'Get the service_role key from: Supabase Dashboard → Project Settings → API → service_role (click 👁️ to reveal)'
	);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});
