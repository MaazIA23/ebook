import React, { useEffect, useState } from "react";
import { api, getApiBaseUrl } from "../api/http";

type Product = {
  id: number;
  title: string;
  description: string;
  price_cents: number;
  cover_image_url?: string | null;
};

type Props = {
  onAddToCart: (p: { id: number; title: string; priceCents: number }) => void;
};

export default function CataloguePage({ onAddToCart }: Props): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalogue = React.useCallback(() => {
    setError(null);
    setIsLoading(true);
    api
      .get("/products/")
      .then((res) => {
        setProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Erreur chargement catalogue:", err);
        const msg = err.response?.data?.detail ?? err.message;
        const isTimeout = err.code === "ECONNABORTED" || (typeof msg === "string" && msg.includes("timeout"));
        setError(
          err.code === "ERR_NETWORK"
            ? "Impossible de joindre l'API. Vérifiez que le backend est en ligne et que CORS autorise cette origine."
            : isTimeout
              ? "Le serveur met un moment à répondre (réveil après inactivité). Réessayez dans quelques secondes."
              : `Impossible de charger le catalogue: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  if (isLoading) {
    return (
      <div className="page-center">
        <div className="card" style={{ maxWidth: 360 }}>
          <p style={{ margin: 0 }}>Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-center">
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 className="card-title">Catalogue</h2>
          <p className="error">{error}</p>
          <p className="card-subtitle">API attendue: {api.defaults.baseURL}</p>
          <p style={{ marginTop: "1rem" }}>
            <button type="button" className="btn btn-primary" onClick={loadCatalogue}>
              Réessayer
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <article key={product.id} className="product-card">
          <div className="product-cover" aria-hidden="true">
            {product.cover_image_url ? (
              <img
                className="product-cover-img"
                src={product.cover_image_url.startsWith("http") ? product.cover_image_url : `${getApiBaseUrl()}${product.cover_image_url}`}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="product-cover-placeholder"
              style={{ display: product.cover_image_url ? "none" : "flex" }}
            >
              <div className="product-cover-initial">{product.title?.slice(0, 1).toUpperCase()}</div>
            </div>
          </div>
          <header>
            <h3 className="product-title">{product.title}</h3>
          </header>
          <p className="product-description">{product.description}</p>
          <p className="product-price">{(product.price_cents / 100).toFixed(2)} €</p>
          <div className="product-footer">
            <span className="pill">PDF • Téléchargement immédiat</span>
            <button
              className="btn btn-primary"
              onClick={() =>
                onAddToCart({
                  id: product.id,
                  title: product.title,
                  priceCents: product.price_cents,
                })
              }
            >
              Ajouter au panier
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
