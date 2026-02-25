import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api/http";
import { useAuth } from "./store/AuthContext";
import { useCart } from "./store/CartContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CataloguePage from "./pages/cataloguePage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";

type CheckoutOrder = {
  orderId: number;
  totalCents: number;
  items: { id: number; title: string; priceCents: number }[];
};

function App() {
  const { user, logout, loading } = useAuth();
  const { count: cartCount, items: cartItems, clearCart, addItem } = useCart();
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [view, setView] = useState<"catalogue" | "cart" | "orders">("catalogue");
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(null);
  const [paymentSuccessOrderId, setPaymentSuccessOrderId] = useState<number | null>(null);
  const confirmPaidSentRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("payment_success");
    const orderIdParam = params.get("order_id");
    if (success === "1" && orderIdParam) {
      const orderId = parseInt(orderIdParam, 10);
      if (!Number.isNaN(orderId)) {
        setPaymentSuccessOrderId(orderId);
        setCheckoutOrder(null);
        window.history.replaceState({}, "", window.location.pathname || "/");
      }
    }
  }, []);

  useEffect(() => {
    if (loading || paymentSuccessOrderId === null) return;
    if (confirmPaidSentRef.current === paymentSuccessOrderId) return;
    confirmPaidSentRef.current = paymentSuccessOrderId;
    api
      .post("/payments/confirm-paid", { order_id: paymentSuccessOrderId })
      .catch(() => {});
  }, [paymentSuccessOrderId, loading]);

  const goToCatalogue = useCallback(() => {
    setView("catalogue");
  }, []);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="page-center">
          <div className="card" style={{ textAlign: "center" }}>
            <p style={{ margin: 0 }}>Chargement de votre espace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (authMode === "login" && !user) {
    return <LoginPage onSuccess={() => setAuthMode(null)} />;
  }

  if (authMode === "register" && !user) {
    return <RegisterPage onSuccess={() => setAuthMode(null)} />;
  }

  if (paymentSuccessOrderId !== null) {
    return (
      <div className="app-shell">
        <main className="layout-main">
          <div className="page-center">
            <div className="card" style={{ textAlign: "center", maxWidth: 460 }}>
              <h2 className="success-title">Paiement réussi</h2>
              <p className="success-text">
                Merci pour votre achat. Vous pouvez télécharger vos ebooks depuis « Mes achats ».
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  clearCart();
                  setPaymentSuccessOrderId(null);
                  setView("catalogue");
                }}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Retour au catalogue
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-inner">
          <div
            className="brand"
            onClick={() => {
              setView("catalogue");
              setCheckoutOrder(null);
            }}
          >
            <div className="brand-logo" />
            <div>
              <div className="brand-title">Ebook Store</div>
              <div className="brand-subtitle">Guides & récits pour étudiants</div>
            </div>
          </div>

          <div className="nav-right">
            <button
              type="button"
              className="nav-cart"
              onClick={() => setView("cart")}
              title="Voir le panier"
            >
              🛒 Panier
              {cartCount > 0 && <span className="nav-cart-count">{cartCount}</span>}
            </button>
            {user && (
              <span className="nav-user">
                Bonjour <strong>{user.first_name || user.email}</strong>
              </span>
            )}
            {user ? (
              <>
                <button className="btn btn-ghost" onClick={() => { setView(view === "orders" ? "catalogue" : "orders"); setCheckoutOrder(null); }}>
                  {view === "orders" ? "Catalogue" : "Mes achats"}
                </button>
                <button className="btn btn-secondary btn-ghost" onClick={logout}>
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => setAuthMode("login")}>
                  Se connecter
                </button>
                <button className="btn btn-primary" onClick={() => setAuthMode("register")}>
                  Créer un compte
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="layout-main">
        {view === "catalogue" && !checkoutOrder && (
          <section className="hero">
            <div>
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                Projet d&apos;école • Application déployée
              </div>
              <h1 className="hero-title">
                Construis ta carrière avec nos{" "}
                <span className="hero-highlight">ebooks pensés pour les étudiants</span>.
              </h1>
              <p className="hero-text">
                Des guides concrets pour décrocher ton alternance, des récits pour te motiver, et une
                expérience d&apos;achat simple pensée pour ton projet de fin d&apos;année.
              </p>
            </div>
            <div className="hero-card">
              <div className="badge">
                <span className="badge-dot" />
                Paiement sécurisé par Stripe
              </div>
              <div className="hero-metrics">
                <div className="metric">
                  <div className="metric-label">Guides carrière</div>
                  <div className="metric-value">Alternance & 1er job</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Format</div>
                  <div className="metric-value">PDF téléchargeables</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Accès</div>
                  <div className="metric-value">Illimité après achat</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {checkoutOrder ? (
          <section className="products-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Paiement</h2>
                <p className="section-subtitle">Finalisez votre commande en toute sécurité.</p>
              </div>
            </div>
            <CheckoutPage
              orderId={checkoutOrder.orderId}
              totalCents={checkoutOrder.totalCents}
              items={checkoutOrder.items}
              onBack={() => setCheckoutOrder(null)}
              onSuccess={() => { clearCart(); setCheckoutOrder(null); }}
            />
          </section>
        ) : view === "cart" ? (
          <section className="products-section">
            <CartPage
              onCheckout={async () => {
                if (!user) return;
                const res = await api.post("/orders/", { items: cartItems.map((i) => ({ product_id: i.id })) });
                setCheckoutOrder({ orderId: res.data.id, totalCents: res.data.total_cents, items: cartItems });
              }}
              onContinueShopping={goToCatalogue}
            />
          </section>
        ) : view === "catalogue" ? (
          <section className="products-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  {false ? "Finaliser votre achat" : "Catalogue d’ebooks"}
                </h2>
                <p className="section-subtitle">
                  Ajoutez des ebooks à votre panier, puis validez votre commande depuis le panier.
                </p>
              </div>
            </div>

            <CataloguePage
              onAddToCart={(p) => {
                if (!user) {
                  setAuthMode("login");
                  return;
                }
                addItem({ id: p.id, title: p.title, priceCents: p.priceCents });
              }}
            />
          </section>
        ) : (
          <section className="products-section">
            <OrdersPage />
          </section>
        )}
      </main>

      <footer className="footer">
        Projet d&apos;école – Boutique d&apos;ebooks • Backend FastAPI + Front React • PostgreSQL & Stripe
      </footer>
    </div>
  );
}

export default App;
