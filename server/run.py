#!/usr/bin/env python3
"""Point d'entrée pour Railway : lit PORT depuis l'environnement et lance uvicorn."""
import os
import sys
import uvicorn

# Mettre à jour les produits en base (dont sample_pdf_url pour les extraits) à chaque démarrage
try:
    from seed_products import main as run_seed
    run_seed()
except Exception as e:
    print(f"Seed au démarrage (non bloquant): {e}", file=sys.stderr)

port = int(os.environ.get("PORT", "8000"))
uvicorn.run(
    "src.main:app",
    host="0.0.0.0",
    port=port,
    log_level="info",
)
