# Déploiement — GitHub · Vercel · Supabase

Ce guide te permet de passer de l'app locale à un déploiement cloud complet avec deux environnements (**test** et **prod**), une base Supabase partagée (ou dupliquée) et l'auto-déploiement Vercel sur chaque push.

---

## 1. Supabase — base de données

### 1.1 Créer le projet
1. Va sur [supabase.com](https://supabase.com) → **New project**.
2. Choisis un nom (ex. `div-design-prod`), une région proche (ex. `eu-west-3 · Paris`) et un mot de passe fort.
3. Attends la fin du provisioning (~1 min).

### 1.2 Exécuter le schéma
1. Dans Supabase Studio → **SQL Editor** → **New query**.
2. Colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécute (**Run**).
3. Vérifie : **Table Editor** → `divdesign_state` doit contenir une ligne avec `id=1`.

### 1.3 Activer le Realtime
1. **Database** → **Replication** → active la publication `supabase_realtime` pour la table `divdesign_state` si ce n'est pas déjà fait.

### 1.4 Configurer Google OAuth (obligatoire)

#### a. Google Cloud Console
1. Va sur [console.cloud.google.com](https://console.cloud.google.com) → sélectionne ou crée un projet.
2. **APIs & Services** → **OAuth consent screen** :
   - User Type : **Internal** (si Google Workspace `divprotocol.com`) ou **External**.
   - Nom de l'app : `DIV Design`, email de support, email dev.
   - Scopes : `openid`, `email`, `profile`.
   - (External) Ajoute `divprotocol.com` dans les domaines autorisés.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID** :
   - Type : **Web application**.
   - Nom : `DIV Design Web`.
   - **Authorized JavaScript origins** :
     - `http://localhost:5173` (dev)
     - `https://<ton-domaine-vercel>.vercel.app`
     - `https://app.divprotocol.com` (si domaine custom)
   - **Authorized redirect URIs** :
     - `https://<ref-projet>.supabase.co/auth/v1/callback`
       (exact, récupère l'URL dans Supabase → Authentication → Providers → Google)
4. Copie le **Client ID** et le **Client Secret**.

#### b. Supabase → activer le provider
1. Supabase Studio → **Authentication** → **Providers** → **Google** → **Enable**.
2. Colle **Client ID** et **Client Secret**.
3. Sauvegarde.

#### c. URL de redirection de l'app
Supabase Studio → **Authentication** → **URL Configuration** :
- **Site URL** : `https://<ton-domaine-vercel>.vercel.app` (ou ton domaine custom)
- **Redirect URLs** (ajouter toutes les variantes utilisées) :
  - `http://localhost:5173/**`
  - `https://<ton-domaine-vercel>.vercel.app/**`
  - `https://*.vercel.app/**` (pour les previews de la branche `test`)

#### d. Restriction au domaine `@divprotocol.com`
- **Côté app** : déjà en place. Après le retour OAuth, toute session dont l'email ne se termine pas par `@divprotocol.com` est immédiatement déconnectée avec message d'erreur.
- **Renforcement côté Google** (recommandé) : si `divprotocol.com` est un Google Workspace, configure l'OAuth consent screen en **Internal** — Google rejettera alors tout compte non Workspace avant même d'atteindre l'app.
- **Renforcement côté Supabase** (optionnel) : tu peux ajouter un trigger SQL sur `auth.users` qui supprime tout compte créé avec un email hors domaine.

### 1.5 Récupérer les clés
- **Settings** → **API** :
  - `Project URL` → sera `VITE_SUPABASE_URL`
  - `anon public` key → sera `VITE_SUPABASE_ANON_KEY`

### 1.6 Définir la clé d'accès de l'équipe

Avant le bouton Google, l'app exige une **clé d'accès**. Valeur par défaut : `DIV-2026`.

Pour la changer tout de suite (avant tout déploiement) :
```sql
update public.divdesign_state
set data = jsonb_set(data, '{accessKey}', '"TA-CLE-SECRETE"'::jsonb)
where id = 1;
```
Elle peut aussi être modifiée plus tard depuis l'app (menu profil → **Paramètres admin** → bouton « Modifier la clé »).

> 💡 **Deux bases séparées** ? Refais les étapes ci-dessus pour un second projet `div-design-test`. Tu auras alors un jeu de clés par environnement.

---

## 2. GitHub — repo et branches

### 2.1 Initialiser localement (déjà fait par le script)
```bash
git init
git checkout -b prod
git add .
git commit -m "chore: initial commit"
git checkout -b test
```

### 2.2 Pousser sur GitHub
1. Crée un repo sur [github.com/new](https://github.com/new) (ex. `div-design`), **sans** README/gitignore initial.
2. Relie et push :
   ```bash
   git remote add origin https://github.com/<ton-user>/div-design.git
   git push -u origin prod
   git push -u origin test
   ```
3. Sur GitHub → **Settings** → **Branches** → défini `prod` comme branche par défaut.

---

## 3. Vercel — hébergement

### 3.1 Importer le projet
1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → sélectionne `div-design`.
2. Framework : détecté automatiquement (**Vite**).
3. **Root Directory** : `./`
4. **Build** / **Output** : laisser par défaut (gérés par `vercel.json`).

### 3.2 Variables d'environnement
Dans Vercel → **Settings** → **Environment Variables**, ajoute :

| Clé | Valeur | Environnements |
|---|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase **prod** | Production |
| `VITE_SUPABASE_ANON_KEY` | clé anon **prod** | Production |
| `VITE_SUPABASE_URL` | URL du projet Supabase **test** | Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | clé anon **test** | Preview, Development |

> Si tu n'as qu'une seule base, utilise les mêmes valeurs pour les trois environnements.

### 3.3 Branches → environnements
- **Settings** → **Git** :
  - **Production Branch** : `prod`
  - Toutes les autres branches (dont `test`) génèrent des **Preview Deployments** avec les variables `Preview`.
- Chaque push sur `test` → URL de preview auto.
- Chaque push sur `prod` → déploiement production.

### 3.4 (Facultatif) Domaine custom
- **Settings** → **Domains** → ajoute `app.tondomaine.com` pour la prod et `test.tondomaine.com` pour une preview dédiée (en liant la preview de la branche `test`).

---

## 4. Local — démarrer en branchant Supabase

```bash
cp .env.example .env.local
# édite .env.local avec ton URL + clé anon (base de test)
npm install
npm run dev
```

- Sans env vars → l'app reste 100% `localStorage` (hors-ligne, comme avant).
- Avec env vars → chaque changement est poussé dans Supabase, et les autres clients reçoivent les updates en temps réel.

---

## 5. Workflow recommandé

```
feature/* → PR vers test → merge → preview auto Vercel (base test)
           → QA validée
test → PR vers prod → merge → déploiement prod (base prod)
```

- Branch protection conseillée : exiger une PR pour merger dans `prod`.
- Ajouter plus tard : GitHub Actions pour lint/tests, Supabase migrations versionnées.

---

## 6. Évolution — schéma normalisé

L'approche actuelle (`divdesign_state` en jsonb unique) est parfaite pour un MVP et évite toute migration de code. Quand tu voudras passer à des tables normalisées (users, projects, versions, comments, milestones, notifications avec RLS par utilisateur via Supabase Auth), on pourra :

1. Créer les tables dédiées.
2. Migrer le contenu du jsonb vers ces tables via un script SQL.
3. Remplacer `cloudLoad/cloudSave` par des appels CRUD typés.
4. Activer Supabase Auth (provider Google) pour remplacer le picker simulé.
