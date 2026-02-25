"""
Extrait les 3 premières pages de chaque PDF dans media/ebooks/
et les enregistre dans media/samples/<nom>-extrait.pdf.
Si un ebook n'existe pas encore, crée un PDF placeholder (3 pages) pour que le lien fonctionne.
À lancer depuis server/ : python scripts/extract_samples.py
"""
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.dirname(CURRENT_DIR)
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

EBOOKS_DIR = os.path.join(SERVER_DIR, "media", "ebooks")
SAMPLES_DIR = os.path.join(SERVER_DIR, "media", "samples")
MAX_PAGES = 3

# Fichiers attendus (alignés avec seed_products.py) pour générer les extraits ou placeholders
EXPECTED_EBOOKS = [
    "decrochez-votre-alternance.pdf",
    "chroniques-une-voix-qui-sest-revelee.pdf",
    "ebook-le-secret-dune-belle-diction.pdf",
]


def main():
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        print("Installez pypdf : pip install pypdf")
        sys.exit(1)

    os.makedirs(SAMPLES_DIR, exist_ok=True)
    os.makedirs(EBOOKS_DIR, exist_ok=True)

    count = 0
    for name in EXPECTED_EBOOKS:
        base, _ = os.path.splitext(name)
        out_name = f"{base}-extrait.pdf"
        out_path = os.path.join(SAMPLES_DIR, out_name)
        src = os.path.join(EBOOKS_DIR, name)

        if os.path.isfile(src):
            try:
                reader = PdfReader(src)
                writer = PdfWriter()
                n = min(MAX_PAGES, len(reader.pages))
                for i in range(n):
                    writer.add_page(reader.pages[i])
                with open(out_path, "wb") as f:
                    writer.write(f)
                print(f"  {name} -> {out_name} ({n} page(s))")
                count += 1
            except Exception as e:
                print(f"  Erreur {name}: {e}")
        else:
            # Placeholder : 3 pages vierges pour que le lien « Voir un extrait » fonctionne
            try:
                writer = PdfWriter()
                for _ in range(MAX_PAGES):
                    writer.add_blank_page(width=595, height=842)  # A4
                with open(out_path, "wb") as f:
                    writer.write(f)
                print(f"  (placeholder) -> {out_name} (3 pages)")
                count += 1
            except Exception as e:
                print(f"  Erreur placeholder {out_name}: {e}")

    print(f"Terminé : {count} extrait(s) dans media/samples/")
    if not os.listdir(EBOOKS_DIR):
        print("Astuce : placez les vrais PDF dans media/ebooks/ et relancez pour remplacer les placeholders.")


if __name__ == "__main__":
    main()
