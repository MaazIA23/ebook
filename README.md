## Projet web – Vente d’ebooks / PDF

Application web d’e‑commerce permettant de vendre des ebooks (PDF) avec :

- **Gestion des utilisateurs** : inscription, connexion, déconnexion, profils, rôles (client / admin).
- **Gestion des produits** : création / modification / suppression d’ebooks (admin), catalogue public.
- **Gestion des paiements** : intégration Stripe (paiement par carte, webhook de confirmation).
- **PostgreSQL** : stockage des utilisateurs, produits, commandes, téléchargements.
- **Téléchargement sécurisé** : accès aux PDF uniquement pour les utilisateurs qui ont payé.

### Architecture générale

- **Monorepo** :
  - `client` : frontend (SPA React, par exemple Vite/React).
  - `server` : backend Python avec FastAPI.
  - `docs` : documentation technique et métier.
- **Base de données** : PostgreSQL (Neon, Supabase, Railway, …).
- **Stockage fichiers** : service type S3/R2/Supabase Storage pour héberger les PDF.
- **Déploiement** : 
  - Frontend : Vercel / Netlify.
  - Backend + Postgres : Railway / Render / Fly.io.

Les détails d’architecture sont dans `ARCHITECTURE.md`.

### Lancement rapide (objectif)

1. Cloner le repo depuis GitHub.
2. Créer un fichier `.env` à partir de `.env.example`.
3. Installer les dépendances backend, puis démarrer le serveur.
4. Installer les dépendances frontend, puis démarrer le client.

Les commandes exactes seront précisées au fur et à mesure de l’implémentation.

