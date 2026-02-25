# Server – API Boutique d’ebooks

Backend FastAPI (Python 3.12) : auth JWT, produits, commandes, paiements Stripe, téléchargements, fichiers statiques (couvertures et extraits PDF).

## Commandes

| Commande | Description |
|----------|-------------|
| `pip install -r requirements.txt` | Installer les dépendances |
| `python run.py` | Démarrer l’API (lit `PORT` en env, défaut 8000) |
| `python seed_products.py` | Remplir / mettre à jour les produits en base |
| `python scripts/extract_samples.py` | Générer les PDF d’extrait (3 premières pages) dans `media/samples/` |

En production (Railway), **`run.py`** exécute aussi le seed au démarrage pour mettre à jour les produits (dont `sample_pdf_url` pour les extraits).

## Variables d’environnement

Voir **`.env.example`**. Principales :

- **`DATABASE_URL`** : connexion PostgreSQL (obligatoire en prod).
- **`JWT_SECRET`** : secret pour signer les tokens (obligatoire en prod).
- **`CORS_ORIGINS`** : URL(s) du frontend, séparées par des virgules.
- **`STRIPE_SECRET_KEY`** / **`STRIPE_WEBHOOK_SECRET`** : pour les paiements et le webhook.
- **`PORT`** : injecté par Railway ; ne pas définir à la main en prod.

## Fichiers et dossiers

- **`media/covers/`** : images de couverture → servies sous `/static/covers/`. Voir `media/covers/README.md` pour les noms attendus.
- **`media/ebooks/`** : PDF complets des ebooks (pour générer les extraits).
- **`media/samples/`** : extraits (3 premières pages) → servis sous `/static/samples/`. Générés par `scripts/extract_samples.py`. Voir `media/samples/README.md`.

## Documentation complète

Voir le **README principal** à la racine du projet et **docs/TECHNIQUE.md**, **docs/DEPLOIEMENT-RAILWAY.md**.
