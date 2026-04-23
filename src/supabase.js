import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(URL && ANON);

export const supabase = hasSupabase
  ? createClient(URL, ANON, { auth: { persistSession: false } })
  : null;

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
