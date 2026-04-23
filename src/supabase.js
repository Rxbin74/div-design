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

const TABLES = {
  settings: 'app_settings',
  profiles: 'profiles',
  projects: 'projects',
  versions: 'versions',
  comments: 'comments',
  replies: 'comment_replies',
  roadmap: 'roadmap_milestones',
  notifications: 'notifications',
};

const iso = v => (v ? new Date(v).toISOString() : new Date().toISOString());
const uniq = arr => [...new Set(arr.filter(Boolean))];
const toArray = v => (Array.isArray(v) ? v : []);
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = v => typeof v === 'string' && uuidRe.test(v);
const safeUuidOrNull = v => (isUuid(v) ? v : null);
const safeDate = v => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10);
};

export async function fetchAppState() {
  if (!supabase) return null;
  const [
    settingsRes,
    profilesRes,
    projectsRes,
    versionsRes,
    commentsRes,
    repliesRes,
    roadmapRes,
    notificationsRes,
  ] = await Promise.all([
    supabase.from(TABLES.settings).select('id,access_key').eq('id', 1).maybeSingle(),
    supabase.from(TABLES.profiles).select('id,name,email,role,avatar_url,created_at'),
    supabase.from(TABLES.projects).select('id,name,description,figma_link,color,created_at'),
    supabase.from(TABLES.versions).select('id,project_id,number,title,description,figma_link,image,status,changelog,author_id,created_at'),
    supabase.from(TABLES.comments).select('id,version_id,user_id,text,resolved,created_at'),
    supabase.from(TABLES.replies).select('id,comment_id,user_id,text,created_at'),
    supabase.from(TABLES.roadmap).select('id,project_id,title,start_date,due_date,completed,created_at'),
    supabase.from(TABLES.notifications).select('id,user_id,text,read,type,meta,created_at'),
  ]);

  const errors = [settingsRes, profilesRes, projectsRes, versionsRes, commentsRes, repliesRes, roadmapRes, notificationsRes]
    .map(r => r.error)
    .filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors.map(e => e.message).join(' | '));
  }

  const users = (profilesRes.data || []).map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    avatarUrl: p.avatar_url,
    createdAt: p.created_at,
  }));

  const repliesByComment = new Map();
  (repliesRes.data || []).forEach(r => {
    const list = repliesByComment.get(r.comment_id) || [];
    list.push({
      id: r.id,
      userId: r.user_id,
      authorId: r.user_id,
      text: r.text,
      createdAt: r.created_at,
    });
    repliesByComment.set(r.comment_id, list);
  });

  const commentsByVersion = new Map();
  (commentsRes.data || []).forEach(c => {
    const list = commentsByVersion.get(c.version_id) || [];
    list.push({
      id: c.id,
      userId: c.user_id,
      authorId: c.user_id,
      text: c.text,
      resolved: !!c.resolved,
      createdAt: c.created_at,
      replies: (repliesByComment.get(c.id) || []).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    });
    commentsByVersion.set(c.version_id, list);
  });

  const versionsByProject = new Map();
  (versionsRes.data || []).forEach(v => {
    const list = versionsByProject.get(v.project_id) || [];
    list.push({
      id: v.id,
      number: v.number,
      title: v.title,
      description: v.description,
      figmaLink: v.figma_link,
      figmaUrl: v.figma_link,
      image: v.image,
      previewUrl: v.image,
      status: v.status,
      changelog: Array.isArray(v.changelog) ? v.changelog : [],
      authorId: v.author_id,
      createdBy: v.author_id,
      createdAt: v.created_at,
      comments: (commentsByVersion.get(v.id) || []).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    });
    versionsByProject.set(v.project_id, list);
  });

  const projects = (projectsRes.data || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    figmaLink: p.figma_link,
    figmaUrl: p.figma_link,
    color: p.color,
    ownerId: p.created_by,
    createdAt: p.created_at,
    versions: (versionsByProject.get(p.id) || []).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
  }));

  const roadmap = (roadmapRes.data || []).map(m => ({
    id: m.id,
    projectId: m.project_id,
    title: m.title,
    startDate: m.start_date,
    dueDate: m.due_date,
    completed: !!m.completed,
    createdAt: m.created_at,
  }));

  const notifications = (notificationsRes.data || []).map(n => ({
    id: n.id,
    userId: n.user_id,
    text: n.text,
    read: !!n.read,
    type: n.type,
    meta: n.meta || {},
    createdAt: n.created_at,
  }));

  return {
    accessKey: settingsRes.data?.access_key || 'DIV-2026',
    users,
    projects,
    roadmap,
    notifications,
  };
}

async function upsertRows(table, rows, conflict = 'id') {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict });
  if (error) throw error;
}

async function deleteMissing(table, keepIds) {
  const { data: existing, error } = await supabase.from(table).select('id');
  if (error) throw error;
  const toDelete = (existing || []).map(r => r.id).filter(id => !keepIds.includes(id));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from(table).delete().in('id', toDelete);
    if (delErr) throw delErr;
  }
}

function flattenData(data) {
  const profiles = toArray(data.users).map(u => ({
    id: isUuid(u.id) ? u.id : crypto.randomUUID(),
    auth_user_id: isUuid(u.authUserId) ? u.authUserId : (isUuid(u.id) ? u.id : crypto.randomUUID()),
    name: u.name,
    email: (u.email || '').toLowerCase(),
    role: u.role || 'Membre',
    avatar_url: u.avatarUrl || null,
    created_at: iso(u.createdAt),
    updated_at: new Date().toISOString(),
  }));

  const projects = [];
  const versions = [];
  const comments = [];
  const replies = [];
  toArray(data.projects).forEach(p => {
    projects.push({
      id: p.id,
      name: p.name,
      description: p.description || null,
      figma_link: p.figmaLink || p.figmaUrl || null,
      color: p.color || null,
      created_by: safeUuidOrNull(p.ownerId),
      created_at: iso(p.createdAt),
      updated_at: new Date().toISOString(),
    });
    toArray(p.versions).forEach(v => {
      versions.push({
        id: v.id,
        project_id: p.id,
        number: v.number || 'v0',
        title: v.title || 'Version',
        description: v.description || null,
        figma_link: v.figmaLink || v.figmaUrl || null,
        image: v.image || v.previewUrl || null,
        status: v.status || 'Brouillon',
        changelog: Array.isArray(v.changelog) ? v.changelog : [],
        author_id: safeUuidOrNull(v.authorId || v.createdBy),
        created_at: iso(v.createdAt),
        updated_at: new Date().toISOString(),
      });
      toArray(v.comments).forEach(c => {
        comments.push({
          id: c.id,
          version_id: v.id,
          user_id: safeUuidOrNull(c.userId || c.authorId || c.createdBy),
          text: c.text || '',
          resolved: !!c.resolved,
          created_at: iso(c.createdAt),
          updated_at: new Date().toISOString(),
        });
        toArray(c.replies).forEach(r => {
          replies.push({
            id: r.id,
            comment_id: c.id,
            user_id: safeUuidOrNull(r.userId || r.authorId || r.createdBy),
            text: r.text || '',
            created_at: iso(r.createdAt),
            updated_at: new Date().toISOString(),
          });
        });
      });
    });
  });

  const roadmap = toArray(data.roadmap).map(m => ({
    id: m.id,
    project_id: m.projectId || null,
    title: m.title || 'Milestone',
    start_date: safeDate(m.startDate),
    due_date: safeDate(m.dueDate) || new Date().toISOString().slice(0, 10),
    completed: !!m.completed,
    created_at: iso(m.createdAt),
    updated_at: new Date().toISOString(),
  }));

  const notifications = toArray(data.notifications).map(n => ({
    id: n.id,
    user_id: safeUuidOrNull(n.userId),
    text: n.text || '',
    read: !!n.read,
    type: n.type || null,
    meta: n.meta || {},
    created_at: iso(n.createdAt),
    updated_at: new Date().toISOString(),
  }));

  return { profiles, projects, versions, comments, replies, roadmap, notifications };
}

export async function persistAppState(data) {
  if (!supabase) return { ok: false, reason: 'no-config' };
  const flat = flattenData(data);
  const warnings = [];
  try {
    try {
      await upsertRows(TABLES.settings, [{ id: 1, access_key: data.accessKey || 'DIV-2026', updated_at: new Date().toISOString() }]);
    } catch (e) {
      warnings.push(`settings: ${e.message}`);
    }
    await upsertRows(TABLES.profiles, flat.profiles);
    await upsertRows(TABLES.projects, flat.projects);
    await upsertRows(TABLES.versions, flat.versions);
    await upsertRows(TABLES.comments, flat.comments);
    await upsertRows(TABLES.replies, flat.replies);
    await upsertRows(TABLES.roadmap, flat.roadmap);
    await upsertRows(TABLES.notifications, flat.notifications);

    await deleteMissing(TABLES.notifications, flat.notifications.map(r => r.id));
    await deleteMissing(TABLES.replies, flat.replies.map(r => r.id));
    await deleteMissing(TABLES.comments, flat.comments.map(r => r.id));
    await deleteMissing(TABLES.versions, flat.versions.map(r => r.id));
    await deleteMissing(TABLES.roadmap, flat.roadmap.map(r => r.id));
    await deleteMissing(TABLES.projects, flat.projects.map(r => r.id));
    await deleteMissing(TABLES.profiles, flat.profiles.map(r => r.id));
    return { ok: true, warnings };
  } catch (error) {
    console.warn('[supabase] persistAppState error:', error.message);
    return { ok: false, reason: error.message };
  }
}

export async function updateAccessKey(value) {
  if (!supabase) return { ok: false, reason: 'no-config' };
  const { data, error } = await supabase
    .from(TABLES.settings)
    .update({ access_key: value, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('access_key');
  if (error) return { ok: false, reason: error.message };
  if (!data || data.length === 0) return { ok: false, reason: "Aucune ligne app_settings mise à jour (droits admin requis)." };
  return { ok: true, accessKey: data[0]?.access_key ?? value };
}

export function subscribeAllTables(onChange) {
  if (!supabase) return () => {};
  const channel = supabase.channel('divdesign_all_tables');
  uniq(Object.values(TABLES)).forEach(table => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      onChange
    );
  });
  channel.subscribe();
  return () => { supabase.removeChannel(channel); };
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

export async function ensureProfileForAuthUser(authUser) {
  if (!supabase || !authUser) return { error: new Error('missing auth user') };
  const email = (authUser.email || '').toLowerCase();
  if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    return { error: new Error(`Seuls les comptes @${ALLOWED_EMAIL_DOMAIN} sont autorisés.`) };
  }
  const { data: existingByAuth, error: errAuth } = await supabase
    .from(TABLES.profiles)
    .select('id,name,email,role,avatar_url,created_at')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (errAuth) return { error: errAuth };
  if (existingByAuth) return { profile: existingByAuth };

  const { data: existingByEmail, error: errEmail } = await supabase
    .from(TABLES.profiles)
    .select('id,name,email,role,avatar_url,created_at')
    .eq('email', email)
    .maybeSingle();
  if (errEmail) return { error: errEmail };
  if (existingByEmail) {
    const { data: patched, error: patchErr } = await supabase
      .from(TABLES.profiles)
      .update({
        auth_user_id: authUser.id,
        avatar_url: authUser.user_metadata?.avatar_url || existingByEmail.avatar_url,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || existingByEmail.name,
      })
      .eq('id', existingByEmail.id)
      .select('id,name,email,role,avatar_url,created_at')
      .single();
    if (patchErr) return { error: patchErr };
    return { profile: patched };
  }

  const { count } = await supabase.from(TABLES.profiles).select('*', { count: 'exact', head: true });
  const role = !count || count === 0 ? 'Admin' : 'Membre';
  const insertRow = {
    auth_user_id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0],
    email,
    role,
    avatar_url: authUser.user_metadata?.avatar_url || null,
  };
  const { data: created, error: createErr } = await supabase
    .from(TABLES.profiles)
    .insert(insertRow)
    .select('id,name,email,role,avatar_url,created_at')
    .single();
  if (createErr) return { error: createErr };
  return { profile: created };
}
