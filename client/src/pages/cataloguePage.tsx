import React, { useEffect, useState } from "react";
import { api, getApiBaseUrl } from "../api/http";

type Product = {
  id: number;
  title: string;
  description: string;
  long_description?: string | null;
  price_cents: number;
  cover_image_url?: string | null;
  sample_pdf_url?: string | null;
};

type Props = {
  onAddToCart: (p: { id: number; title: string; priceCents: number }) => void;
};

export default function CataloguePage({ onAddToCart }: Props): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const coverUrl = (product: Product) =>
    product.cover_image_url?.startsWith("http")
      ? product.cover_image_url
      : product.cover_image_url
        ? `${getApiBaseUrl()}${product.cover_image_url}`
        : null;

  const samplePdfUrl = (product: Product) =>
    product.sample_pdf_url?.startsWith("http")
      ? product.sample_pdf_url
      : product.sample_pdf_url
        ? `${getApiBaseUrl()}${product.sample_pdf_url}`
        : null;

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
    <>
      <div className="product-grid">
        {products.map((product) => (
          <article
            key={product.id}
            className="product-card"
            onClick={() => setSelectedProduct(product)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedProduct(product);
              }
            }}
          >
            <div className="product-cover" aria-hidden="true">
              {coverUrl(product) ? (
                <img
                  className="product-cover-img"
                  src={coverUrl(product)!}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="product-cover-placeholder"
                style={{ display: coverUrl(product) ? "none" : "flex" }}
              >
                <div className="product-cover-initial">{product.title?.slice(0, 1).toUpperCase()}</div>
              </div>
            </div>
            <header>
              <h3 className="product-title">{product.title}</h3>
            </header>
            <p className="product-description">{product.description}</p>
            <p className="product-price">{(product.price_cents / 100).toFixed(2)} €</p>
            <div className="product-footer" onClick={(e) => e.stopPropagation()}>
              <span className="pill">PDF • Téléchargement immédiat</span>
              <div className="product-footer-actions">
                {samplePdfUrl(product) && (
                  <a
                    href={samplePdfUrl(product)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary product-extract-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Voir un extrait
                  </a>
                )}
                <button
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart({
                      id: product.id,
                      title: product.title,
                      priceCents: product.price_cents,
                    });
                  }}
                >
                  Ajouter au panier
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedProduct && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedProduct(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-product-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="modal-product-title" className="modal-product-title" style={{ margin: 0, flex: 1 }}>
                {selectedProduct.title}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedProduct(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {coverUrl(selectedProduct) && (
                <div className="modal-product-cover">
                  <img
                    src={coverUrl(selectedProduct)!}
                    alt=""
                    style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "contain" }}
                  />
                </div>
              )}
              <p className="modal-product-description">
                {selectedProduct.long_description ?? selectedProduct.description}
              </p>
              <p className="modal-product-price">{(selectedProduct.price_cents / 100).toFixed(2)} €</p>
              {samplePdfUrl(selectedProduct) && (
                <a
                  href={samplePdfUrl(selectedProduct)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "center", marginBottom: "0.75rem" }}
                >
                  Voir un extrait (PDF)
                </a>
              )}
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  onAddToCart({
                    id: selectedProduct.id,
                    title: selectedProduct.title,
                    priceCents: selectedProduct.price_cents,
                  });
                  setSelectedProduct(null);
                }}
              >
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
