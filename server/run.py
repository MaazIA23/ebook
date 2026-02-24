#!/usr/bin/env python3
"""Point d'entrée pour Railway : lit PORT depuis l'environnement et lance uvicorn."""
import os
import uvicorn

port = int(os.environ.get("PORT", "8000"))
uvicorn.run(
    "src.main:app",
    host="0.0.0.0",
    port=port,
    log_level="info",
)
