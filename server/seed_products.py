import os
import sys


# Permet d'importer "src.*" quand on exécute ce script depuis server/
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from src.db.database import Base, SessionLocal, engine  # noqa: E402
from src.models.product import Product  # noqa: E402
from src.models.order import Order, OrderItem  # noqa: F401,E402
from src.models.user import User  # noqa: F401,E402


def upsert_product(db, *, title: str, description: str, price_cents: int, file_key: str, cover_image_url: str | None = None):
    existing = db.query(Product).filter(Product.title == title).first()
    if existing:
        existing.description = description
        existing.price_cents = price_cents
        existing.file_key = file_key
        existing.cover_image_url = cover_image_url
        existing.is_active = True
        return existing, False

    product = Product(
        title=title,
        description=description,
        price_cents=price_cents,
        file_key=file_key,
        cover_image_url=cover_image_url,
        is_active=True,
    )
    db.add(product)
    return product, True


def main():
    # Assure la création des tables si elles n'existent pas
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        p1, created1 = upsert_product(
            db,
            title="Décrochez votre alternance",
            description=(
                "Le guide pratique pour trouver une alternance rapidement : CV, LinkedIn, "
                "candidatures efficaces, préparation aux entretiens et exemples de messages."
            ),
            price_cents=1490,
            file_key="ebooks/decrochez-votre-alternance.pdf",
            cover_image_url="/static/covers/decrochez-votre-alternance.png",
        )

        p2, created2 = upsert_product(
            db,
            title="Chroniques d'une voix qui s'est révélé",
            description=(
                "Un recueil intime de textes courts : doutes, déclics et reconstruction. "
                "Une voix qui se cherche, puis se révèle."
            ),
            price_cents=990,
            file_key="ebooks/chroniques-une-voix-qui-sest-revelee.pdf",
            cover_image_url="/static/covers/chroniques-une-voix-qui-sest-revelee.png",
        )

        p3, created3 = upsert_product(
            db,
            title="Le secret d'une belle diction",
            description=(
                "Un ebook pour améliorer votre élocution et votre prise de parole : "
                "exercices, conseils et astuces pour une diction claire et assurée."
            ),
            price_cents=1290,
            file_key="ebooks/ebook-le-secret-dune-belle-diction.pdf",
            cover_image_url="/static/covers/le-secret-dune-belle-diction.png",
        )

        db.commit()
        db.refresh(p1)
        db.refresh(p2)
        db.refresh(p3)

        print("Seed OK")
        print(f"- {p1.id} | {p1.title} | {(p1.price_cents / 100):.2f} € | {'créé' if created1 else 'mis à jour'}")
        print(f"- {p2.id} | {p2.title} | {(p2.price_cents / 100):.2f} € | {'créé' if created2 else 'mis à jour'}")
        print(f"- {p3.id} | {p3.title} | {(p3.price_cents / 100):.2f} € | {'créé' if created3 else 'mis à jour'}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
