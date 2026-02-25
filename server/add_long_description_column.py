"""Ajoute la colonne long_description à la table products."""
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from sqlalchemy import text
from src.db.database import engine

def main():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN long_description TEXT;"))
            conn.commit()
            print("Colonne long_description ajoutée.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print("Colonne long_description déjà présente.")
            else:
                raise

if __name__ == "__main__":
    main()
