# Backend API (FastAPI + uvicorn)
FROM python:3.12-slim

WORKDIR /app

# Dépendances système pour psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY media/ ./media/
COPY start.sh ./
RUN chmod +x start.sh

# Créer media si vide (covers/ebooks peuvent être montés en volume ou ajoutés au build)
RUN mkdir -p media/covers media/ebooks

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# start.sh lit $PORT (Railway) et lance uvicorn
CMD ["./start.sh"]
