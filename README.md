# DIV Design — Gestionnaire de versions design

Application web (React + Vite) permettant à une équipe design de versionner ses maquettes Figma, de demander des reviews, d'échanger des commentaires et de suivre une roadmap Gantt.

## Fonctionnalités

- **Authentification Google** (picker simulé) — le premier compte créé devient Admin.
- **Projets** : création, édition, suppression, couleur, lien Figma.
- **Versions** : historique horodaté, changelog, aperçu image, statuts.
- **Commentaires & réponses** avec résolution, notifications.
- **Roadmap Gantt** full-height, avec vues Heure / Jour / Semaine / Mois.
- **Persistance cloud** via Supabase (fallback `localStorage` si non configuré).
- **Realtime** : chaque client est synchronisé via les events Postgres Changes.

## Prérequis

- Node.js >= 18
- npm (ou yarn / pnpm)

## Installation

```bash
npm install
cp .env.example .env.local   # remplir avec les clés Supabase (optionnel)
npm run dev
```

L'app s'ouvre sur [http://localhost:5173](http://localhost:5173).

> **Sans clés Supabase**, l'app fonctionne en local uniquement via `localStorage`.

## Déploiement

Voir le guide complet : **[DEPLOYMENT.md](DEPLOYMENT.md)** — étapes GitHub / Vercel / Supabase avec branches `test` et `prod`.

## Build

```bash
npm run build    # sortie: dist/
npm run preview  # prévisualisation du build
```

## Réinitialiser les données locales

```js
localStorage.removeItem('divdesign-v1');
location.reload();
```

## Structure

```
.
├── index.html              # Entrée HTML + police Inter
├── vite.config.js          # Configuration Vite
├── vercel.json             # Configuration Vercel (SPA rewrites)
├── .env.example            # Variables d'env Supabase
├── DEPLOYMENT.md           # Guide de déploiement
├── supabase/
│   └── schema.sql          # Schéma SQL à exécuter dans Supabase
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx            # Point d'entrée React
    ├── App.jsx             # Application complète
    └── supabase.js         # Client Supabase (load / save / realtime)
```

## Stack

- **React 18** + **Vite 5**
- **Supabase** (Postgres + Realtime) pour la persistance cloud
- **Vercel** pour l'hébergement (`prod` = branche de production, `test` = previews)
- Styles en ligne (CSS-in-JS simple, sans dépendance)
- Police **Inter** via Google Fonts
