import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Circle Clique's Supabase client (CLAUDE.md section 3: "Backend:
 * Supabase ... RLS on every table"; section 3 "Config": keys come from
 * .env, never hard-coded, and .env itself is gitignored).
 *
 * Works identically on Android and iPhone (section 2 rule 1): the only
 * platform-specific piece is session storage, and AsyncStorage already
 * has an equivalent native implementation on both, so no
 * src/platform/ adapter is needed here.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in your project's values " +
      "(Settings → API in the Supabase dashboard).",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // SMS/phone OTP (section 5.5) never redirects through a browser,
    // so URL-based session detection would just be dead weight here.
    detectSessionInUrl: false,
  },
});
