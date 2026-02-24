import { useState } from "react";
import { useAuth } from "../store/AuthContext";
import { useCart } from "../store/CartContext";

type Props = {
  onCheckout: () => void | Promise<void>;
  onContinueShopping: () => void;
};

export default function CartPage({ onCheckout, onContinueShopping }: Props) {
  const { user } = useAuth();
  const { items, removeItem, totalCents, count } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleCheckout(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      await onCheckout();
    } catch (err) {
      console.error("Erreur passage commande:", err);
      setCheckoutError("Impossible de créer la commande. Vérifiez votre connexion et réessayez.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (count === 0) {
    return (
      <div className="page-center">
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <h2 className="card-title">Votre panier est vide</h2>
          <p className="card-subtitle">Ajoutez des ebooks depuis le catalogue pour les acheter.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => {
              e.preventDefault();
              onContinueShopping();
            }}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Voir le catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="section-header">
        <div>
          <h2 className="section-title">Panier</h2>
          <p className="section-subtitle">{count} article{count > 1 ? "s" : ""} dans votre panier.</p>
        </div>
      </div>

      <div className="cart-list">
        {items.map((item) => (
          <div key={item.id} className="cart-item">
            <div className="cart-item-info">
              <span className="cart-item-title">{item.title}</span>
              <span className="cart-item-price">{(item.priceCents / 100).toFixed(2)} €</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => removeItem(item.id)}
              aria-label="Retirer du panier"
            >
              Retirer
            </button>
          </div>
        ))}
      </div>

      <div className="cart-footer">
        <div className="cart-total">
          <span>Total</span>
          <strong>{(totalCents / 100).toFixed(2)} €</strong>
        </div>
        {!user ? (
          <p className="card-subtitle">Connectez-vous pour passer commande.</p>
        ) : (
          <div className="cart-actions">
            {checkoutError && <p className="error" style={{ width: "100%", marginBottom: "0.5rem" }}>{checkoutError}</p>}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContinueShopping();
              }}
            >
              Continuer mes achats
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? "Création de la commande..." : "Passer commande"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
