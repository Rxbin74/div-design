# Déploiement — GitHub · Vercel · Supabase (base partagée)

Ce guide correspond à l’architecture actuelle : **données métier 100% en base Supabase normalisée**.

## 1) Supabase

### 1.1 Créer le projet
1. [supabase.com](https://supabase.com) → New project.
2. Choisir région/mot de passe.

### 1.2 Exécuter le schéma
1. Ouvrir SQL Editor.
2. Exécuter [`supabase/schema.sql`](supabase/schema.sql).
3. Vérifier la présence des tables :
   - `app_settings`
   - `profiles`
   - `projects`
   - `versions`
   - `comments`
   - `comment_replies`
   - `roadmap_milestones`
   - `notifications`

Le script inclut :
- RLS,
- policies,
- triggers `updated_at`,
- migration depuis l’ancienne table `divdesign_state` si elle existe.

### 1.3 Realtime
Database → Replication : publication `supabase_realtime` active pour les tables ci-dessus.

### 1.4 Google OAuth (obligatoire)
1. Google Cloud Console :
   - OAuth Consent Screen configuré,
   - OAuth Client Web créé.
2. URIs :
   - Origin dev : `http://localhost:5173`
   - Origins prod/preview : domaines Vercel
   - Redirect URI : `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google : coller Client ID/Secret.
4. Supabase → Authentication → URL Configuration :
   - Site URL : domaine prod
   - Redirect URLs : localhost + domaines Vercel (+ previews)

### 1.5 Restriction domaine
- Front : blocage hors `@divprotocol.com`.
- Base : trigger `enforce_profile_domain` sur `profiles`.

### 1.6 Clé d’accès globale
Stockée dans `app_settings.access_key` (`id=1`).

Exemple SQL :
```sql
update public.app_settings
set access_key = 'TA-CLE-SECRETE'
where id = 1;
```

## 2) Variables d’environnement

Dans `.env.local` et Vercel :

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Sans ces variables, la connexion Google et la base partagée ne fonctionneront pas.

## 3) GitHub

Branches recommandées :
- `prod` (production)
- `test` (preview)

Push :
```bash
git push -u origin prod
git push -u origin test
```

## 4) Vercel

1. Importer le repo.
2. Build Vite (`vercel.json` déjà fourni).
3. Définir la branche de production sur `prod`.
4. Configurer les variables env (Production / Preview).

## 5) Vérifications multi-utilisateurs

1. User A change la clé d’accès → User B voit immédiatement la nouvelle clé.
2. User A crée un projet/version/commentaire → User B voit les changements sans refresh.
3. Nouveau user connecté Google (`@divprotocol.com`) apparaît dans l’équipe.
4. Un email hors domaine est rejeté.
