# Client – Boutique d’ebooks

Frontend React (Vite + TypeScript) de la boutique d’ebooks : catalogue, panier, checkout Stripe, compte utilisateur.

## Commandes

| Commande | Description |
|----------|-------------|
| `npm install` | Installer les dépendances |
| `npm run dev` | Lancer le serveur de dev (proxy vers l’API sur le port 8000) |
| `npm run build` | Build de production (dossier `dist/`) |
| `npm run preview` | Prévisualiser le build |

## Variables d’environnement

Copier `.env.example` vers `.env` et renseigner :

- **`VITE_API_URL`** (obligatoire en production) : URL du backend, sans slash final (ex. `https://ton-api.up.railway.app`). En dev, si non définie, le proxy Vite cible `http://localhost:8000`.
- **`VITE_STRIPE_PUBLISHABLE_KEY`** (optionnel) : clé publique Stripe pour afficher le formulaire de paiement par carte (`pk_test_...` ou `pk_live_...`). Sans elle, seul le mode simulation est disponible.

Les variables `VITE_*` sont injectées **au build** ; après modification en production, il faut redéployer.

## Documentation complète

Voir le **README principal** à la racine du projet et **docs/DEPLOIEMENT-RAILWAY.md** pour le déploiement.
