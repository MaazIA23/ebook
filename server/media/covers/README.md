# Couvertures des ebooks

Déposez ici les images de couverture. Elles sont servies par l’API sous `/static/covers/`.

**Noms de fichiers attendus** (pour correspondre au catalogue) :

| Fichier | Produit |
|--------|---------|
| `decrochez-votre-alternance.svg` | Décrochez votre alternance |
| `chroniques-une-voix-qui-sest-revelee.svg` | Chroniques d'une voix qui s'est révélée |
| `le-secret-dune-belle-diction.svg` | Le secret d'une belle diction |

Formats acceptés : `.svg`, `.png`, `.jpg`, `.webp`. Si vous utilisez un autre nom (ex. `.png`), mettez à jour l’URL dans le seed `server/seed_products.py` (champ `cover_image_url`).

Après avoir ajouté ou modifié des images, relancez le seed pour mettre à jour la base :  
`cd server && python seed_products.py`
