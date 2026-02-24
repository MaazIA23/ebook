import { useState } from "react";
import { api } from "../api/http";
import { useAuth } from "../store/AuthContext";

type CartItem = { id: number; title: string; priceCents: number };

type Props = {
  orderId: number;
  totalCents: number;
  items: CartItem[];
  onBack: () => void;
  onSuccess: () => void;
};

export default function CheckoutPage({ orderId, totalCents, items, onBack, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handlePay() {
    if (!user) {
      setError("Vous devez être connecté pour acheter.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const intentRes = await api.post("/payments/create-intent", { order_id: orderId });
      const { client_secret } = intentRes.data;
      alert(`Paiement simulé ! client_secret: ${client_secret}`);
      try {
        await api.post("/payments/mock-confirm", { order_id: orderId });
      } catch {
        // silencieux
      }
      setSuccess(true);
    } catch (err) {
      setError("Erreur lors du paiement. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="page-center">
        <div className="card" style={{ textAlign: "center" }}>
          <h2 className="success-title">Paiement réussi</h2>
          <p className="success-text">
            Merci pour votre achat{items.length > 1 ? ` de ${items.length} ebooks` : ""}. Vous pourrez les télécharger
            depuis « Mes achats » une fois le paiement confirmé.
          </p>
          <button className="btn btn-primary" onClick={onSuccess} style={{ width: "100%", justifyContent: "center" }}>
            Retour au catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: 460 }}>
        <h2 className="card-title">Récapitulatif</h2>
        <p className="card-subtitle">Vérifiez les informations avant de procéder au paiement.</p>
        <div className="checkout-summary">
          <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.2rem" }}>
            {items.map((item) => (
              <li key={item.id} className="checkout-title" style={{ marginBottom: "0.25rem" }}>
                {item.title} — {(item.priceCents / 100).toFixed(2)} €
              </li>
            ))}
          </ul>
          <p className="checkout-price">Total : {(totalCents / 100).toFixed(2)} €</p>
          <p className="product-description" style={{ marginTop: "0.4rem" }}>
            Paiement sécurisé par Stripe. Accès immédiat aux PDF après validation.
          </p>
        </div>
        {error && <p className="error">{error}</p>}
        <button
          className="btn btn-primary"
          onClick={handlePay}
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
        >
          {loading ? "Traitement..." : `Payer ${(totalCents / 100).toFixed(2)} €`}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={{ width: "100%", justifyContent: "center", marginTop: "0.6rem" }}
        >
          Retour au panier
        </button>
      </div>
    </div>
  );
}
