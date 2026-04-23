# DIV Design — Gestionnaire de versions design

Application web (React + Vite) pour versionner des maquettes design, collaborer en équipe et piloter une roadmap.

## Points clés

- **Base partagée obligatoire** : toutes les données métier sont stockées en **Supabase Postgres** (pas de source locale navigateur).
- **Schéma normalisé** : `app_settings`, `profiles`, `projects`, `versions`, `comments`, `comment_replies`, `roadmap_milestones`, `notifications`.
- **Auth Google réelle** via Supabase Auth, avec restriction domaine `@divprotocol.com`.
- **Clé d’accès globale** stockée dans `app_settings`, visible identique pour tous les utilisateurs.
- **Realtime multi-clients** sur toutes les tables via Postgres Changes.

## Prérequis

- Node.js >= 18
- npm
- Un projet Supabase configuré (schema SQL + provider Google)

## Installation

```bash
npm install
cp .env.example .env.local
```

Variables requises dans `.env.local` :

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Lancement :

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Déploiement

Guide complet : [DEPLOYMENT.md](DEPLOYMENT.md)

## Structure

```
.
├── .env.example
├── DEPLOYMENT.md
├── supabase/
│   └── schema.sql
└── src/
    ├── App.jsx
    ├── main.jsx
    └── supabase.js
```
