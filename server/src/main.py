import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.db.database import Base, engine
from src.routes import auth, products, orders, payments, downloads


Base.metadata.create_all(bind=engine)

# CORS : en prod, définir CORS_ORIGINS (ex. "https://monapp.vercel.app")
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174")
CORS_ORIGINS_LIST = [o.strip() for o in _cors_origins.split(",") if o.strip()]

app = FastAPI(
    title="Ebook Store API",
    description="API pour l'application de vente d'ebooks / PDF",
    version="0.1.0",
)


class ProxyHeadersMiddleware(BaseHTTPMiddleware):
    """En prod (Railway, etc.), le proxy envoie X-Forwarded-Proto. On force le scheme en https pour que les redirections (ex. /products -> /products/) pointent vers HTTPS."""
    async def dispatch(self, request: Request, call_next):
        if request.headers.get("x-forwarded-proto") == "https":
            request.scope["scheme"] = "https"
        return await call_next(request)


app.add_middleware(ProxyHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fichiers statiques (PDF, couvertures)
_media_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "media")
if os.path.isdir(_media_dir):
    app.mount("/static", StaticFiles(directory=_media_dir), name="static")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(downloads.router)


@app.get("/health", tags=["system"])
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/", tags=["system"])
def root() -> dict:
    return {"message": "Bienvenue sur l'API de vente d'ebooks"}
