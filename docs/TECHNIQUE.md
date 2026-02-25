## Documentation technique – Vente d’ebooks / PDF

Ce document décrit les choix techniques, l’architecture, les variables d’environnement et les **problèmes rencontrés lors du déploiement** (avec solutions). L’historique détaillé des correctifs et du versioning est dans `CHANGELOG.md`.

### 1. Contexte et objectifs

- Application web permettant la **vente d’ebooks / PDF**.
- Exigences principales : déploiement en ligne, gestion utilisateurs, gestion produits, paiements en ligne, base PostgreSQL, documentation.

### 2. Stack technique (implémentée)

- **Frontend (`client/`)** : SPA React (Vite), axios, Stripe React.
- **Backend (`server/`)** : Python 3.12 + FastAPI + Uvicorn.
- **Base de données** : PostgreSQL (SQLAlchemy, pas de migrations Alembic en prod pour l’instant).
- **Paiement** : Stripe (PaymentIntent + webhook + mode mock optionnel).
- **Fichiers** : PDF et couvertures servis par FastAPI (`/static` depuis `server/media/`). Extraits PDF (3 premières pages) dans `media/samples/` pour le lien « Voir un extrait » sur le catalogue.
- **Impact conversion** : aperçu PDF (extrait), rappel panier (bandeau sur le catalogue).
- **Déploiement** : Railway (backend + frontend + PostgreSQL), ou Render/Vercel selon `DEPLOIEMENT.md` / `DEPLOIEMENT-RAILWAY.md`.

Les détails complets d’architecture sont dans `ARCHITECTURE.md`.

### 3. Architecture logique

- API REST exposée par FastAPI :
  - `/auth` : inscription, connexion, rafraîchissement de token, profil.
  - `/products` : CRUD produits (admin), liste et détail (public).
  - `/orders` : création commande, consultation, historique.
  - `/payments` : intégration Stripe (création PaymentIntent, webhook).
  - `/downloads` : génération de lien sécurisé pour les PDF achetés.
- Authentification via **JWT** (tokens signés côté backend).

### 4. Base de données (PostgreSQL)

Tables prévues (détaillées dans `ARCHITECTURE.md`) :

- `users` : informations de compte, rôle (customer / admin).
- `products` : ebooks avec prix, description, lien vers fichier PDF, optionnellement `sample_pdf_url` (extrait 3 premières pages).
- `orders` : commandes passées par les utilisateurs.
- `order_items` : association commande ↔ produit.
- `downloads` (optionnel) : historique des téléchargements.

Les migrations SQL ou outil ORM (SQLAlchemy/SQLModel) seront définis lors de l’implémentation.

### 5. Déploiement (cible)

- **Backend** :
  - Hébergé sur Railway / Render / Fly.io.
  - Variables d’environnement : `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, configuration stockage.
- **Base PostgreSQL** :
  - Fournie par le même hébergeur ou par Neon / Supabase.
- **Frontend** :
  - Déployé sur Vercel / Netlify et configuré pour pointer vers l’URL publique du backend.

### 6. Sécurité

- Mots de passe hashés (bcrypt) côté backend.
- Tokens JWT signés avec `JWT_SECRET`.
- Vérification stricte de la signature des webhooks Stripe.
- Génération d’URL signées à durée limitée pour les téléchargements de PDF.

### 7. Tests et qualité

- Tests unitaires et d’intégration (backend) prévus avec `pytest` et/ou outils FastAPI.
- Linting Python (par exemple `ruff` ou `flake8`) et formatage (`black`).
- Pipeline GitHub Actions pour automatiser tests et lint.

### 8. Variables d’environnement

Liste complète (détail dans `server/.env.example`) :

| Variable | Rôle | Exemple / remarque |
|----------|------|--------------------|
| `DATABASE_URL` | Connexion PostgreSQL | Obligatoire en prod. Sur Railway : utiliser `DATABASE_URL` (interne) pour le backend. |
| `JWT_SECRET` | Signature des tokens | Obligatoire en prod, longue chaîne aléatoire. |
| `JWT_ALGORITHM` | Algorithme JWT | `HS256` (défaut). |
| `JWT_ACCESS_TOKEN_EXPIRES_MINUTES` | Durée de vie du token | `30` (défaut). |
| `STRIPE_SECRET_KEY` | Clé API Stripe | `sk_test_...` ou `sk_live_...`. |
| `STRIPE_WEBHOOK_SECRET` | Signature webhook Stripe | `whsec_...`. |
| `CORS_ORIGINS` | Origines autorisées (CORS) | URL du frontend en prod, sans slash final (ex. `https://monapp.up.railway.app`). |
| `PAYMENTS_MOCK_ENABLED` | Mode mock paiement | `0` en prod, `1` en dev si besoin. |
| `PORT` | Port d’écoute (backend) | **Injecté par Railway** ; ne pas définir à la main. Le backend lit cette variable via `server/run.py`. |

**Seed au démarrage** : `server/run.py` exécute `seed_products.main()` avant de lancer uvicorn. En production (Railway), les produits sont donc mis à jour à chaque déploiement (dont les URLs d’extraits `sample_pdf_url`). En cas d’échec du seed (ex. base injoignable), l’erreur est loguée mais le serveur démarre quand même.

**Extraits PDF** : le script `server/scripts/extract_samples.py` extrait les 3 premières pages des PDF dans `media/ebooks/` et les enregistre dans `media/samples/<nom>-extrait.pdf`. Si un PDF source est absent, un placeholder (3 pages vides) est créé. Les URLs sont servies sous `/static/samples/` et enregistrées en base via le seed (`sample_pdf_url`).

**Frontend (build Vite)** :

| Variable | Rôle | Exemple |
|----------|------|---------|
| `VITE_API_URL` | URL de l’API en production | `https://ton-api.up.railway.app` (sans slash final). Lue **au build** ; redéployer le front après modification. |

---

### 9. Problèmes rencontrés et solutions (déploiement Railway)

Résumé des principaux blocages et correctifs. Le détail et le versioning sont dans **`CHANGELOG.md`**.

#### 9.1 Variable `PORT` non définie → 502 / "Application failed to respond"

**Cause :** Railway injecte la variable d’environnement `PORT` dans le conteneur. Si le backend est lancé avec une commande du type `uvicorn ... --port $PORT` exécutée **sans shell**, `$PORT` n’est pas développée et uvicorn reçoit la chaîne littérale `"$PORT"` → erreur « Invalid value for '--port' » et aucun processus à l’écoute sur le bon port → 502.

**Solution retenue :** Un script Python **`server/run.py`** lit `os.environ.get("PORT", "8000")` et lance uvicorn. Ainsi, la variable est lue au **runtime** dans l’environnement du conteneur. Le Dockerfile utilise `CMD ["python", "run.py"]`. Sur Railway, la **Start Command** du service backend doit rester **vide** pour que ce CMD soit utilisé.

#### 9.2 Redirection 307 vers HTTP (mixed content)

**Cause :** FastAPI redirige `/products` vers `/products/`. Derrière un proxy, la requête arrive en HTTP ; l’en-tête `Location` était donc en `http://...`. Le front (HTTPS) refusait de suivre → échec réseau.

**Solution :** Middleware qui force `request.scope["scheme"] = "https"` lorsque `X-Forwarded-Proto: https` est présent. Côté front, appel direct à `/products/` pour éviter la redirection.

#### 9.3 Front appelle localhost, CORS, timeout, catalogue vide

- **Front vers localhost :** Définir **`VITE_API_URL`** sur le service frontend et **redéployer** (Vite injecte au build).
- **CORS :** Définir **`CORS_ORIGINS`** sur le backend = URL du frontend.
- **Timeout :** Timeout axios porté à 60 s pour tolérer le cold start Railway.
- **Catalogue vide :** Exécuter **`python seed_products.py`** une fois avec `DATABASE_URL` pointant vers la base Railway (ex. `DATABASE_PUBLIC_URL` depuis la machine locale).

#### 9.4 Autres points

- **Build front (npm ci)** : Garder `package-lock.json` à jour après toute modification de `package.json` (ex. `npm install` puis commit).
- **Backend :** Ne pas utiliser de Start Command avec `npx` sur le service backend (image Python uniquement). Laisser le CMD du Dockerfile.
- **Pydantic :** Utiliser `from_attributes = True` (et non `orm_mode`) dans les modèles pour éviter les warnings avec Pydantic v2.

---

### 10. Versioning

- **Changelog détaillé :** `docs/CHANGELOG.md`.
- **Version actuelle :** 1.0.0 (premier déploiement fonctionnel sur Railway avec les correctifs listés ci-dessus).
- **Convention :** SemVer (MAJOR.MINOR.PATCH) pour les releases.

### 11. Référence des documents

| Document | Contenu |
|----------|---------|
| `docs/TECHNIQUE.md` | Ce document : stack, architecture, variables, problèmes/solutions, versioning. |
| `docs/CHANGELOG.md` | Historique des problèmes rencontrés et solutions (dont variable PORT), version 1.0.0. |
| `docs/DEPLOIEMENT-RAILWAY.md` | Guide pas à pas Railway (backend, frontend, PostgreSQL, CORS, dépannage logs). |
| `docs/DEPLOIEMENT.md` | Déploiement Render + Vercel. |
| `docs/METIER.md` | Règles métier et cas d’usage. |
| `docs/ARCHITECTURE.md` | Architecture détaillée du système. |
| `server/.env.example` | Modèle des variables d’environnement backend. |

