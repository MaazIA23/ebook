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
                  setView("orders");
                }}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Voir mes achats
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
            <div>
              <div className="brand-title">La Muse Eloquente</div>
            </div>
          </div>

          <div className="nav-right">
            {user && (
              <span className="nav-user">
                Bonjour <strong>{user.first_name || user.email}</strong>
              </span>
            )}
            <button
              type="button"
              className="nav-cart"
              onClick={() => setView("cart")}
              title="Voir le panier"
            >
              🛒 Panier
              {cartCount > 0 && <span className="nav-cart-count">{cartCount}</span>}
            </button>
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
              <p className="hero-footer-text">
                La Muse Eloquente – Boutique d&apos;ebooks
              </p>
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
              onSuccess={() => { clearCart(); setCheckoutOrder(null); setView("orders"); }}
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
                  Méthodes et techniques pour transformer votre élocution et révéler l&apos;orateur en vous.
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
        La Muse Eloquente – Boutique d&apos;ebooks
      </footer>
    </div>
  );
}

export default App;
