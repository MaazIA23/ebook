# Extraits PDF (3 premières pages)

Ce dossier est rempli par le script `server/scripts/extract_samples.py` à partir des PDF complets dans `media/ebooks/`.

Pour générer les extraits :
1. Placez les PDF des ebooks dans `server/media/ebooks/`.
2. Depuis `server/` : `python scripts/extract_samples.py`
3. Relancez le seed : `python seed_products.py`

Les URLs d’extraits sont servies sous `/static/samples/<nom>-extrait.pdf`.
