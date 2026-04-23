import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(URL && ANON);

export const supabase = hasSupabase
  ? createClient(URL, ANON, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
    })
  : null;

export const ALLOWED_EMAIL_DOMAIN = 'divprotocol.com';

const TABLE = 'divdesign_state';
const ROW_ID = 1;

export async function cloudLoad() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle();
  if (error) {
    console.warn('[supabase] load error:', error.message);
    return null;
  }
  return data || null;
}

export async function cloudSave(appData) {
  if (!supabase) return { ok: false, reason: 'no-config' };
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data: appData, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) {
    console.warn('[supabase] save error:', error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export function cloudSubscribe(onChange) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel('divdesign_state_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${ROW_ID}` },
      payload => { if (payload.new?.data) onChange(payload.new.data, payload.new.updated_at); })
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// ──────── Auth (Google OAuth) ────────

export async function signInWithGoogle() {
  if (!supabase) return { error: new Error('Supabase non configuré') };
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account', hd: ALLOWED_EMAIL_DOMAIN },
    },
  });
}

export async function supabaseSignOut() {
  if (!supabase) return;
  try { await supabase.auth.signOut(); } catch {}
}

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}
