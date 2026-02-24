# Image légère et stable
FROM python:3.12-slim

# Empêche Python d’écrire des .pyc
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Dépendances système nécessaires (ex: psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copier le code
COPY src ./src
COPY media ./media
COPY run.py .

# S'assurer que les dossiers media existent
RUN mkdir -p media/covers media/ebooks

EXPOSE 8000

# run.py lit PORT depuis l'environnement Railway au démarrage
CMD ["python", "run.py"]