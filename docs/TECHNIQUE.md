## Documentation technique – Vente d’ebooks / PDF

Ce document décrit les choix techniques, l’architecture et les points importants pour déployer et maintenir l’application.

### 1. Contexte et objectifs

- Application web permettant la **vente d’ebooks / PDF**.
- Exigences principales : déploiement en ligne, gestion utilisateurs, gestion produits, paiements en ligne, base PostgreSQL, documentation.

### 2. Stack technique (prévue)

- **Frontend (`client/`)** : SPA React (Vite) ou équivalent.
- **Backend (`server/`)** : Python + FastAPI.
- **Base de données** : PostgreSQL (hébergée sur une plateforme managée).
- **Paiement** : Stripe (PaymentIntent + webhook).
- **Stockage fichiers** : service compatible S3 pour les PDF (URL signées).
- **CI/CD** : GitHub Actions (build + tests, déploiement facultatif).

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
- `products` : ebooks avec prix, description, lien vers fichier PDF.
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

Les variables seront listées précisément dans `.env.example` (à compléter) :

- `DATABASE_URL=`
- `JWT_SECRET=`
- `STRIPE_SECRET_KEY=`
- `STRIPE_WEBHOOK_SECRET=`
- `STORAGE_BUCKET_URL=` (ou équivalent)

