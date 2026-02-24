# Guide de déploiement – Ebook Store

Ce guide décrit comment déployer l’application en production avec **Render** (backend + base PostgreSQL) et **Vercel** (frontend).

---

## 1. Prérequis

- Un dépôt **GitHub** à jour avec ce projet
- Comptes **Render**, **Vercel** et **Stripe** (gratuits pour commencer)

---

## 2. Déployer le backend sur Render

### 2.1 Créer la base PostgreSQL

1. Sur [render.com](https://render.com), **Dashboard** → **New** → **PostgreSQL**.
2. Choisir un nom (ex. `ebookstore-db`), région proche, plan **Free**.
3. Créer. Noter l’**Internal Database URL** (et **External** si tu veux te connecter en local).

### 2.2 Créer le Web Service (API)

1. **New** → **Web Service**.
2. Connecter le dépôt GitHub et sélectionner ce projet.
3. Configuration :
   - **Name** : `ebookstore-api` (ou autre)
   - **Root Directory** : `server`
   - **Runtime** : Python 3
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
4. **Advanced** → **Add Environment Variable** et ajouter :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | *(coller l’Internal Database URL de l’étape 2.1)* |
| `JWT_SECRET` | Une longue chaîne aléatoire (ex. générée avec `openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` | Ta clé secrète Stripe (ex. `sk_live_...` ou `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | À remplir après avoir configuré le webhook Stripe (étape 4) |
| `CORS_ORIGINS` | L’URL du frontend Vercel, ex. `https://ton-app.vercel.app` (sans slash final) |
| `PAYMENTS_MOCK_ENABLED` | `0` en production |

5. Créer le service. Render attribue une URL du type `https://ebookstore-api.onrender.com`.

### 2.3 Fichiers statiques (media)

Le dossier `server/media` (couverts, PDF) est dans le repo. Lors du déploiement, Render clone le repo donc `media/` est bien présent. Si tu ajoutes des fichiers plus tard, pousse-les sur GitHub ou utilise un stockage externe (S3, etc.).

### 2.4 Initialiser la base (seed)

Option A – depuis ta machine (recommandé) :

```bash
cd server
# Remplacer par l’External Database URL fournie par Render (ou garder .env avec cette URL)
set DATABASE_URL=postgresql://...  # (Windows)
# ou export DATABASE_URL=...       # (Linux/Mac)
python seed_products.py
```

Option B – sur Render : **Shell** (onglet du service) puis :

```bash
cd /opt/render/project/src
python seed_products.py
```

---

## 3. Déployer le frontend sur Vercel

1. Sur [vercel.com](https://vercel.com), **Add New** → **Project** et importer le dépôt GitHub.
2. Configuration :
   - **Root Directory** : `client` (ou laisser la racine et définir **Root Directory** à `client`)
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
3. **Environment Variables** :
   - **Name** : `VITE_API_URL`
   - **Value** : l’URL de ton API Render, ex. `https://ebookstore-api.onrender.com` (sans slash final)
4. Déployer. Vercel fournit une URL du type `https://ton-projet.vercel.app`.

---

## 4. CORS et webhook Stripe

1. Retourner sur Render → ton Web Service → **Environment**.
2. Mettre à jour **CORS_ORIGINS** avec l’URL exacte du frontend Vercel (ex. `https://ton-projet.vercel.app`). Plusieurs origines : les séparer par des virgules, sans espace.
3. **Stripe webhook** : dans le tableau de bord Stripe, **Developers** → **Webhooks** → **Add endpoint** :
   - URL : `https://ebookstore-api.onrender.com/payments/webhook` (adapter si ton URL API est différente)
   - Événements : `payment_intent.succeeded`, etc. (selon ton code)
   - Récupérer le **Signing secret** (`whsec_...`) et le mettre dans `STRIPE_WEBHOOK_SECRET` sur Render.

---

## 5. Vérifications

- **Frontend** : ouvrir l’URL Vercel → le catalogue doit s’afficher et les appels doivent partir vers l’API Render (onglet Réseau du navigateur).
- **API** : `https://ton-api.onrender.com/health` doit répondre `{"status":"ok"}`.
- **Connexion / Inscription** : tester depuis le site Vercel.
- **Paiement** : en mode test Stripe, vérifier qu’une commande peut être payée et que le webhook est bien reçu.

---

## 6. Déploiement avec Docker (optionnel)

Le dossier `server/` contient un **Dockerfile**. Pour déployer l’API en conteneur (sur un VPS, Railway, etc.) :

```bash
cd server
docker build -t ebookstore-api .
docker run -p 8000:8000 -e DATABASE_URL=... -e JWT_SECRET=... ebookstore-api
```

Les variables d’environnement listées dans `.env.example` doivent être fournies (fichier `.env` ou `-e`).

---

## 7. Résumé des URLs et variables

| Rôle | Où | Variable / URL |
|------|-----|----------------|
| API (backend) | Render | URL du type `https://xxx.onrender.com` |
| Frontend | Vercel | URL du type `https://xxx.vercel.app` |
| Base de données | Render PostgreSQL | `DATABASE_URL` (Internal pour l’API) |
| Frontend → API | Vercel | `VITE_API_URL` = URL Render de l’API |
| API → CORS | Render | `CORS_ORIGINS` = URL Vercel du frontend |

Une fois ces étapes faites, l’application est déployée et utilisable en ligne.
