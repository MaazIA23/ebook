# Boutique d’ebooks – La Muse Éloquente

Application web de vente d’ebooks (PDF) : catalogue, panier, paiement Stripe, téléchargement sécurisé après achat.

---

## Fonctionnalités

- **Catalogue** : liste des ebooks avec couverture, description, prix.
- **Aperçu / extrait** : lien « Voir un extrait » pour feuilleter les 3 premières pages (PDF) sur chaque fiche produit.
- **Rappel panier** : bandeau sur le catalogue quand le panier n’est pas vide (« Vous avez X article(s) dans votre panier ») avec accès rapide au panier.
- **Utilisateurs** : inscription, connexion, déconnexion, profil (client / admin).
- **Paiement** : Stripe (carte, webhook), avec mode simulation si Stripe non configuré.
- **Téléchargement** : accès aux PDF achetés via « Mes achats » (liens signés).
- **Base de données** : PostgreSQL (utilisateurs, produits, commandes).

---

## Stack

| Rôle        | Techno                          |
|------------|----------------------------------|
| Frontend   | React (Vite), TypeScript, Axios, Stripe React |
| Backend    | Python 3.12, FastAPI, Uvicorn   |
| Base       | PostgreSQL (SQLAlchemy)         |
| Paiement   | Stripe (PaymentIntent + webhook)|
| Fichiers   | PDF et couvertures servis par l’API (`/static` depuis `server/media/`) |
| Déploiement| Railway (backend + front + Postgres) ou Vercel + autre backend |

---

## Lancement en local

### Prérequis

- Node.js (npm), Python 3.12+, PostgreSQL (ou URL distante).

### 1. Backend

```bash
cd server
cp .env.example .env
# Éditer .env : DATABASE_URL, JWT_SECRET, Stripe (optionnel)
pip install -r requirements.txt
python seed_products.py    # remplir la base (produits)
python run.py              # ou : uvicorn src.main:app --reload --port 8000
```

L’API est disponible sur `http://localhost:8000`.  
**Seed au démarrage** : en production (Railway), `run.py` exécute aussi le seed au lancement pour mettre à jour les produits (dont les URLs d’extraits).

### 2. Extraits PDF (3 premières pages)

Pour que « Voir un extrait » affiche un vrai PDF :

```bash
cd server
# Placer les PDF complets dans media/ebooks/ (voir server/media/samples/README.md)
python scripts/extract_samples.py
python seed_products.py
```

Sans PDF dans `media/ebooks/`, le script crée des PDF placeholder (3 pages vides) pour que le lien fonctionne.

### 3. Frontend

```bash
cd client
cp .env.example .env
# En local, .env peut rester par défaut (proxy Vite vers /api et /static)
npm install
npm run dev
```

Ouvre `http://localhost:5173`. Le proxy Vite envoie `/api` et `/static` vers le backend.

---

## Variables d’environnement

### Backend (`server/.env`)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | oui (prod) | URL PostgreSQL |
| `JWT_SECRET` | oui (prod) | Secret pour signer les tokens JWT |
| `STRIPE_SECRET_KEY` | pour paiement réel | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | pour webhook | Secret du webhook Stripe |
| `CORS_ORIGINS` | prod | URL(s) du frontend, séparées par des virgules |
| `PORT` | — | Injecté par Railway ; optionnel en local (défaut 8000) |

Voir `server/.env.example` pour la liste complète.

### Frontend (`client/.env`)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `VITE_API_URL` | oui (prod) | URL du backend (ex. `https://ton-api.up.railway.app`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | pour carte | Clé publique Stripe (`pk_test_...` ou `pk_live_...`) |

En dev, sans `VITE_API_URL`, le front utilise le proxy vers `localhost:8000`.

---

## Structure du projet

```
projetweb/
├── client/                 # Frontend React (Vite)
│   ├── src/
│   │   ├── api/            # Axios, getApiBaseUrl
│   │   ├── pages/          # Catalogue, Panier, Checkout, etc.
│   │   └── App.tsx
│   └── .env.example
├── server/                 # Backend FastAPI
│   ├── src/
│   │   ├── routes/         # auth, products, orders, payments, downloads
│   │   ├── models/
│   │   └── main.py
│   ├── media/
│   │   ├── covers/         # Images de couverture (servies sous /static/covers/)
│   │   ├── ebooks/         # PDF complets (pour générer les extraits)
│   │   └── samples/       # Extraits 3 premières pages (servis sous /static/samples/)
│   ├── scripts/
│   │   └── extract_samples.py   # Génère les PDF d’extrait
│   ├── seed_products.py
│   ├── run.py              # Point d’entrée Railway (seed + uvicorn)
│   └── Dockerfile
├── docs/                   # Documentation détaillée
│   ├── TECHNIQUE.md
│   ├── DEPLOIEMENT-RAILWAY.md
│   ├── DEPLOIEMENT.md
│   ├── METIER.md
│   └── CHANGELOG.md
└── README.md               # Ce fichier
```

---

## Déploiement (Railway)

- **Backend** : Root Directory `server`, build via Dockerfile, pas de Start Command personnalisée (utilisation du `CMD` du Dockerfile). Variables : `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, Stripe.
- **Frontend** : Root Directory `client`, build `npm install && npm run build`, start `npx serve -s dist -l $PORT`. Variable **`VITE_API_URL`** = URL du backend (sans slash final).
- **CORS** : `CORS_ORIGINS` sur le backend = URL du frontend.

Le **seed** est exécuté automatiquement au démarrage du backend sur Railway ; les produits (et les URLs d’extraits) sont donc à jour après chaque déploiement.

Guide pas à pas : **`docs/DEPLOIEMENT-RAILWAY.md`**.

---

## Documentation

| Document | Contenu |
|----------|---------|
| **README.md** | Ce fichier : présentation, lancement, variables, structure. |
| **docs/TECHNIQUE.md** | Stack, architecture, variables, problèmes/solutions, versioning. |
| **docs/DEPLOIEMENT-RAILWAY.md** | Déploiement Railway étape par étape. |
| **docs/DEPLOIEMENT.md** | Déploiement Render + Vercel. |
| **docs/METIER.md** | Règles métier et cas d’usage. |
| **docs/CHANGELOG.md** | Historique des changements et correctifs. |
| **server/.env.example** | Modèle des variables backend. |
| **server/media/covers/README.md** | Noms des couvertures attendus. |
| **server/media/samples/README.md** | Génération des extraits PDF. |

---

## Licence / Éditeur

La Muse Éloquente – Boutique d’ebooks.
