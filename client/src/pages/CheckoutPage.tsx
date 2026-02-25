import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
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

const stripePublishableKey = (import.meta.env as { VITE_STRIPE_PUBLISHABLE_KEY?: string }).VITE_STRIPE_PUBLISHABLE_KEY ?? "";

function PaymentForm({
  orderId,
  totalCents,
  onSuccess,
  onError,
}: {
  orderId: number;
  totalCents: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const returnUrl = useMemo(
    () => `${window.location.origin}${window.location.pathname || "/"}?payment_success=1&order_id=${orderId}`,
    [orderId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    onError("");
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: {
            name: "Client Ebook Store",
          },
        },
      },
    });
    if (error) {
      onError(error.message ?? "Erreur lors du paiement.");
      setLoading(false);
      return;
    }
    try {
      await api.post("/payments/confirm-paid", { order_id: orderId });
    } catch {
      // Le webhook peut aussi mettre à jour le statut ; on affiche quand même le succès
    }
    onSuccess();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="checkout-stripe-form">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={!stripe || loading}
        style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
      >
        {loading ? "Traitement..." : `Payer ${(totalCents / 100).toFixed(2)} €`}
      </button>
    </form>
  );
}

export default function CheckoutPage({ orderId, totalCents, items, onBack, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    []
  );

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
      setClientSecret(client_secret);
    } catch (err) {
      setError("Erreur lors de l'initialisation du paiement. Vérifiez la configuration Stripe.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMockPay() {
    if (!user) {
      setError("Vous devez être connecté pour acheter.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/payments/mock-confirm", { order_id: orderId });
      setSuccess(true);
    } catch {
      setError("Erreur lors du paiement simulé.");
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

  if (clientSecret && stripePromise) {
    return (
      <div className="page-center">
        <div className="card" style={{ maxWidth: 460 }}>
          <h2 className="card-title">Paiement par carte</h2>
          <p className="card-subtitle">
            Utilisez une carte de test : <strong>4242 4242 4242 4242</strong>, date future, CVC quelconque.
          </p>
          <div className="checkout-summary" style={{ marginBottom: "1rem" }}>
            <p className="checkout-price">Total : {(totalCents / 100).toFixed(2)} €</p>
          </div>
          {error && <p className="error">{error}</p>}
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: { borderRadius: "8px" },
              },
            }}
          >
            <PaymentForm
              orderId={orderId}
              totalCents={totalCents}
              onSuccess={() => setSuccess(true)}
              onError={setError}
            />
          </Elements>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setClientSecret(null)}
            style={{ width: "100%", justifyContent: "center", marginTop: "0.6rem" }}
          >
            Retour au récapitulatif
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
        {stripePromise ? (
          <button
            className="btn btn-primary"
            onClick={handlePay}
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
          >
            {loading ? "Chargement..." : `Payer ${(totalCents / 100).toFixed(2)} €`}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleMockPay}
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
          >
            {loading ? "Traitement..." : `Payer (simulation) ${(totalCents / 100).toFixed(2)} €`}
          </button>
        )}
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
