# Architecture — Application de vente d’ebooks / PDF

## 1. Vue d’ensemble

Application web type **e-commerce B2C** pour vendre des ebooks (PDF) : inscription, authentification, catalogue, panier, paiement, téléchargement des fichiers achetés.

---

## 2. Stack technique recommandée

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Frontend** | React (Vite) ou Next.js | Interface utilisateur, SPA ou SSR |
| **Backend** | Node.js (Express/Fastify) ou Python (FastAPI) | API REST, logique métier |
| **Base de données** | PostgreSQL | Données utilisateurs, produits, commandes |
| **Stockage fichiers** | AWS S3 / Cloudflare R2 / Supabase Storage | Stockage des PDF (sécurisé, liens signés) |
| **Paiement** | Stripe | Paiement en ligne (CB, etc.) |
| **Auth** | JWT + bcrypt ou Passport.js | Connexion / déconnexion, sessions |
| **Déploiement** | Vercel (front) + Railway / Render / Fly.io (back + Postgres) | Hébergement et déploiement |
| **CI/CD** | GitHub Actions | Tests, build, déploiement automatique |

**Alternative simple tout-en-un :** Next.js (API Routes) + PostgreSQL (Neon/Supabase) + Vercel → un seul repo, déploiement unique.

---

## 3. Architecture système (schéma)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           UTILISATEURS (navigateur)                       │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React/Next.js)                                                │
│  • Pages : Accueil, Catalogue, Détail produit, Panier, Checkout          │
│  • Auth : Login, Register, Profil, Déconnexion                           │
│  • Bibliothèque : Mes ebooks achetés + téléchargement PDF                 │
└─────────────────────────────────────────────────────────────────────────┘
                    │ HTTPS / API REST
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND (API REST)                                                      │
│  • /auth     : register, login, logout, refresh, me                       │
│  • /users    : CRUD profil (optionnel admin)                             │
│  • /products : CRUD ebooks (admin), liste, détail (public)               │
│  • /orders   : création commande, historique, détail                    │
│  • /payments : création intent Stripe, webhook confirmation              │
│  • /downloads: génération lien signé PDF (après paiement validé)         │
└─────────────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │  Stockage    │ │   Stripe     │
│  (users,     │ │  (PDF ebooks)│ │   (paiement) │
│   products,  │ │  S3/R2/etc.  │ │   webhook    │
│   orders)    │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## 4. Modèle de données (PostgreSQL)

### Entités principales

- **users**  
  - `id`, `email`, `password_hash`, `first_name`, `last_name`, `role` (customer | admin), `created_at`, `updated_at`

- **products**  
  - `id`, `title`, `description`, `price_cents`, `cover_image_url`, `file_key` (chemin/clef du PDF dans le stockage), `is_active`, `created_at`, `updated_at`

- **orders**  
  - `id`, `user_id`, `status` (pending | paid | failed | refunded), `stripe_payment_intent_id`, `total_cents`, `created_at`

- **order_items**  
  - `id`, `order_id`, `product_id`, `price_cents` (prix au moment de l’achat)

- **downloads** (optionnel, pour traçabilité)  
  - `id`, `user_id`, `product_id`, `order_id`, `downloaded_at`

Contraintes utiles : clés étrangères (`user_id`, `order_id`, `product_id`), index sur `users.email`, `orders.user_id`, `orders.stripe_payment_intent_id`.

---

## 5. Flux métier principaux

1. **Inscription / Connexion**  
   Register → hash du mot de passe (bcrypt) → enregistrement en base → Login → émission JWT (access + optional refresh). Déconnexion = invalidation côté client (suppression du token).

2. **Catalogue**  
   Liste des produits actifs (GET /products), détail (GET /products/:id). Pas d’auth requise pour la lecture.

3. **Panier**  
   Géré côté frontend (state/localStorage) ou via une table `cart` en base. Au checkout : création **order** (status `pending`) + **order_items**.

4. **Paiement**  
   Backend crée un PaymentIntent Stripe avec `amount`, `metadata` (order_id, user_id) → frontend utilise Stripe.js pour confirmer le paiement.  
   Stripe envoie un **webhook** `payment_intent.succeeded` → backend met à jour la commande en `paid` et enregistre les achats (order_items) comme droits de téléchargement pour l’utilisateur.

5. **Téléchargement**  
   Endpoint protégé (ex. GET /downloads/:productId ou /orders/:orderId/download/:productId) qui vérifie que l’utilisateur a bien acheté le produit (via `orders` + `order_items`), puis génère une **URL signée** (S3/R2/Supabase) vers le PDF et redirige ou renvoie l’URL.

---

## 6. Structure du projet (monorepo recommandée)

```
projetweb/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions : tests, build
├── client/                     # Frontend (React/Next)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/           # appels API
│   │   └── store/              # état global (auth, panier)
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Backend (Node ou Python)
│   ├── src/
│   │   ├── routes/             # auth, products, orders, payments
│   │   ├── middleware/         # auth, validation
│   │   ├── services/           # Stripe, storage, email si besoin
│   │   └── db/                 # schéma, migrations, requêtes
│   ├── package.json
│   └── (migrations SQL ou outil type Prisma/Drizzle)
├── docs/
│   ├── TECHNIQUE.md            # Doc technique (architecture, API, déploiement)
│   └── METIER.md               # Doc métier (cas d’usage, règles, glossaire)
├── ARCHITECTURE.md             # Ce fichier
├── README.md
└── .env.example
```

Tu peux aussi tout mettre dans un seul projet **Next.js** (dossier `app/`, `app/api/`, Prisma/Drizzle, etc.) si tu privilégies la simplicité.

---

## 7. Déploiement

- **Frontend**  
  - Build statique (Vite) → Vercel, Netlify, ou même servi par le backend.  
  - Next.js → Vercel idéal.

- **Backend**  
  - Node/Python sur **Railway**, **Render** ou **Fly.io**.  
  - Variables d’environnement : `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, config stockage (S3/R2).

- **PostgreSQL**  
  - **Neon**, **Supabase** ou **Railway** (base managée).  
  - `DATABASE_URL` fournie par la plateforme.

- **CI/CD (GitHub Actions)**  
  - Sur push main : install, lint, tests, build front + back.  
  - Optionnel : déploiement auto vers Vercel + backend (Railway/Render) si tu branches configurées.

---

## 8. Sécurité (résumé)

- Mots de passe : hash **bcrypt** (jamais en clair).
- API protégées : middleware qui vérifie le **JWT** (Bearer).
- Rôle **admin** pour CRUD produits ; les clients ne voient que leurs commandes et leurs téléchargements.
- PDF servis uniquement via **URL signées** à courte durée de vie, jamais d’URL publique permanente.
- **Webhook Stripe** : vérifier la signature avec `STRIPE_WEBHOOK_SECRET`.
- HTTPS partout en production.

---

## 9. Documentation à livrer

- **README.md**  
  - Description du projet, prérequis, installation locale, commandes (dev, build, test), lien vers la doc.

- **docs/TECHNIQUE.md**  
  - Stack, architecture (référence à ce fichier), schéma de la BDD, liste des endpoints API, choix d’hébergement, CI/CD, variables d’environnement.

- **docs/METIER.md**  
  - Contexte (vente d’ebooks), acteurs (client, admin), cas d’usage (inscription, achat, téléchargement), règles métier (prix, droits de téléchargement), glossaire.

- **GitHub**  
  - Repo public ou privé (selon consigne), `.env` jamais commité, `.env.example` fourni.

---

## 10. Ordre de réalisation suggéré

1. Repo GitHub + structure de dossiers + `.env.example`.
2. Schéma PostgreSQL (tables users, products, orders, order_items) + migrations.
3. Backend : auth (register, login, JWT), puis CRUD produits (admin), puis commandes + Stripe (PaymentIntent + webhook).
4. Stockage : upload PDF (admin), génération d’URL signée pour téléchargement après achat.
5. Frontend : pages publiques (catalogue, détail), auth (login/register/logout), panier, checkout Stripe, page “Mes ebooks” avec téléchargement.
6. Déploiement (Postgres + backend + frontend) et CI/CD.
7. Rédaction **docs/TECHNIQUE.md** et **docs/METIER.md**.

Tu peux partir sur cette base et adapter (par exemple tout Next.js + Supabase) si ton prof impose un cadre précis. Si tu me dis ton langage préféré (Node vs Python) et si tu veux un seul projet Next.js ou front + back séparés, je peux te proposer la structure de dossiers et les premiers fichiers (README, schéma SQL, squelettes d’API) adaptés à ce choix.
