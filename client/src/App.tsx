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
  const [authMode, setAuthMode] = useState<"login" | "register" | "choice" | null>(null);
  const [pendingAddToCart, setPendingAddToCart] = useState<{ id: number; title: string; priceCents: number } | null>(null);
  const [view, setView] = useState<"catalogue" | "cart" | "orders" | "legal">("catalogue");
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(null);
  const [paymentSuccessOrderId, setPaymentSuccessOrderId] = useState<number | null>(null);
  const [cartMessage, setCartMessage] = useState<{ type: "success" | "info"; text: string } | null>(null);
  const [cartReminderDismissed, setCartReminderDismissed] = useState(false);
  const confirmPaidSentRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cartMessage) return;
    const t = setTimeout(() => setCartMessage(null), 4000);
    return () => clearTimeout(t);
  }, [cartMessage]);

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

  const onAuthSuccess = useCallback(() => {
    setAuthMode(null);
    if (pendingAddToCart) {
      addItem(pendingAddToCart);
      setPendingAddToCart(null);
    }
  }, [pendingAddToCart, addItem]);

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="page-center">
          <div className="card" style={{ textAlign: "center" }}>
            <p style={{ margin: 0, color: "var(--text)" }}>Chargement de votre espace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (authMode === "choice" && !user) {
    return (
      <div className="app-shell">
        <header className="navbar">
          <div className="navbar-inner">
            <div className="brand" onClick={() => { setAuthMode(null); setPendingAddToCart(null); }}>
              <div>
                <div className="brand-title">La Muse Eloquente</div>
              </div>
            </div>
          </div>
        </header>
        <main className="layout-main">
          <div className="page-center">
            <div className="card auth-choice-card">
              <h1 className="card-title">Pour acheter cet ebook</h1>
              <p className="card-subtitle">
                Connectez-vous à votre compte ou créez-en un pour continuer.
              </p>
              <div className="auth-choice-buttons">
                <button type="button" className="btn btn-primary" onClick={() => setAuthMode("register")}>
                  Créer un compte
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setAuthMode("login")}>
                  Se connecter
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setAuthMode(null); setPendingAddToCart(null); }}
                style={{ marginTop: "0.5rem" }}
              >
                Retour au catalogue
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (authMode === "login" && !user) {
    return (
      <LoginPage
        onSuccess={onAuthSuccess}
        onBack={() => { setAuthMode(null); setPendingAddToCart(null); }}
      />
    );
  }

  if (authMode === "register" && !user) {
    return (
      <RegisterPage
        onSuccess={onAuthSuccess}
        onBack={() => { setAuthMode(null); setPendingAddToCart(null); }}
      />
    );
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
                <button className="btn btn-primary" onClick={() => setAuthMode("register")}>
                  Créer un compte
                </button>
                <button className="btn btn-ghost" onClick={() => setAuthMode("login")}>
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {cartMessage && (
        <div className={`cart-toast cart-toast-${cartMessage.type}`} role="status">
          {cartMessage.type === "success" ? "✓ " : ""}{cartMessage.text}
        </div>
      )}

      {view === "catalogue" && cartCount > 0 && !cartReminderDismissed && (
        <div className="cart-reminder" role="status">
          <span className="cart-reminder-text">
            Vous avez {cartCount} article{cartCount > 1 ? "s" : ""} dans votre panier.
          </span>
          <div className="cart-reminder-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setView("cart")}>
              Voir le panier
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCartReminderDismissed(true)} aria-label="Fermer">
              ×
            </button>
          </div>
        </div>
      )}

      <main className="layout-main">
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
          <>
            <section className="author-section">
              <div className="author-photo">
                <img src="/author.png" alt="L'auteure" />
              </div>
              <div className="author-content">
                <h2 className="author-title">Biographie de l&apos;auteur</h2>
                <p className="author-text">
                  Mazidath Bello est une auteure béninoise, coach en éloquence et fondatrice de &quot;La Muse Éloquente&quot;. Championne nationale d&apos;éloquence en France, elle accompagne des centaines de personnes à révéler leur potentiel oratoire. Forte d&apos;une communauté de plus de 70&nbsp;000 abonnés, elle inspire la jeunesse africaine et francophone à prendre la parole avec confiance. &quot;Chroniques d&apos;une voix qui s&apos;est révélée&quot; est son premier ouvrage autobiographique. Ses ebooks vous donnent les méthodes concrètes pour transformer votre prise de parole, étape par étape. Des centaines de personnes ont déjà franchi le cap grâce à ses techniques. Découvrez dès maintenant les outils qui vous permettront de briller à l&apos;oral.
                </p>
              </div>
            </section>

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
                  setPendingAddToCart({ id: p.id, title: p.title, priceCents: p.priceCents });
                  setAuthMode("choice");
                  return;
                }
                if (cartItems.some((item) => item.id === p.id)) {
                  setCartMessage({ type: "info", text: "Cet ebook est déjà dans le panier." });
                  return;
                }
                addItem({ id: p.id, title: p.title, priceCents: p.priceCents });
                setCartMessage({ type: "success", text: "Ebook ajouté au panier avec succès." });
              }}
            />
            </section>

            <section className="testimonials-section">
              <h2 className="testimonials-title">Avis &amp; Témoignages</h2>
              <p className="testimonials-subtitle">Ce que disent les lecteurs et lectrices qui ont acheté nos ebooks.</p>
              <div className="testimonials-grid">
                <blockquote className="testimonial-card">
                  <p className="testimonial-text">&quot;J&apos;ai acheté «&nbsp;Chroniques d&apos;une voix qui s&apos;est révélée&nbsp;». J&apos;y ai appris à structurer un discours et à gérer mon stress avant de prendre la parole. Les exercices de respiration m&apos;ont vraiment aidée.&quot;</p>
                  <footer className="testimonial-author">— A. K., acheté l&apos;ebook</footer>
                </blockquote>
                <blockquote className="testimonial-card">
                  <p className="testimonial-text">&quot;Après «&nbsp;Le secret d&apos;une belle diction&nbsp;», ma prononciation s&apos;est nettement améliorée. Les exercices sont faciles à faire au quotidien. Je recommande à tous ceux qui veulent être mieux compris à l&apos;oral.&quot;</p>
                  <footer className="testimonial-author">— M. D., acheté l&apos;ebook</footer>
                </blockquote>
                <blockquote className="testimonial-card">
                  <p className="testimonial-text">&quot;J&apos;ai pris «&nbsp;Décrochez votre alternance&nbsp;» pour préparer mes entretiens. J&apos;ai appris à me présenter en 2 minutes et à argumenter avec clarté. J&apos;ai décroché mon alternance grâce à ces techniques.&quot;</p>
                  <footer className="testimonial-author">— T. B., acheté l&apos;ebook</footer>
                </blockquote>
                <blockquote className="testimonial-card">
                  <p className="testimonial-text">&quot;J&apos;ai acheté plusieurs ebooks de La Muse Éloquente. Chacun m&apos;a apporté des outils concrets : la posture, le regard, la voix. Aujourd&apos;hui je prends la parole en réunion sans appréhension.&quot;</p>
                  <footer className="testimonial-author">— S. L., acheté les ebooks</footer>
                </blockquote>
                <blockquote className="testimonial-card">
                  <p className="testimonial-text">&quot;«&nbsp;Chroniques d&apos;une voix qui s&apos;est révélée&nbsp;» m&apos;a permis de comprendre d&apos;où venait ma peur de parler en public. Les exercices m&apos;aident à m&apos;affirmer. Je recommande vivement.&quot;</p>
                  <footer className="testimonial-author">— F. M., acheté l&apos;ebook</footer>
                </blockquote>
                <blockquote className="testimonial-card">
                  <p className="testimonial-text">&quot;J&apos;ai acheté «&nbsp;Le secret d&apos;une belle diction&nbsp;» pour mon fils. En quelques semaines sa façon d&apos;articuler s&apos;est améliorée. Contenu accessible et efficace.&quot;</p>
                  <footer className="testimonial-author">— C. R., acheté l&apos;ebook</footer>
                </blockquote>
              </div>
            </section>
          </>
        ) : view === "legal" ? (
          <section className="products-section legal-page">
            <div className="section-header">
              <button type="button" className="btn btn-ghost" onClick={() => setView("catalogue")} style={{ alignSelf: "flex-start" }}>
                ← Retour à l&apos;accueil
              </button>
            </div>
            <div className="legal-content">
              <h2 className="legal-title">Mentions légales</h2>
              <p><strong>Éditeur du site</strong><br />La Muse Éloquente – Boutique d&apos;ebooks.</p>
              <p>Pour toute question : contact via les réseaux sociaux (liens en bas de page).</p>

              <h2 className="legal-title">Confidentialité</h2>
              <p>Les données collectées (email, nom lors de l&apos;inscription) servent à la gestion de votre compte et de vos achats. Les paiements sont traités par Stripe ; nous ne stockons pas vos coordonnées bancaires.</p>
              <p>Vous pouvez demander l&apos;accès ou la suppression de vos données en nous contactant. Nous ne vendons pas vos données à des tiers.</p>

              <h2 className="legal-title">Cookies</h2>
              <p>Le site utilise des cookies techniques nécessaires au fonctionnement (session, panier). En poursuivant votre navigation, vous acceptez leur utilisation.</p>
            </div>
          </section>
        ) : (
          <section className="products-section">
            <OrdersPage />
          </section>
        )}
      </main>

      <section className="faq-section">
        <div className="faq-inner">
          <h2 className="faq-title">Questions fréquemment posées</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary className="faq-question">Comment acheter un ebook ?</summary>
              <p className="faq-answer">
                Créez un compte ou connectez-vous, parcourez le catalogue, ajoutez l&apos;ebook au panier puis validez le paiement par carte (Stripe). Vous pourrez télécharger vos achats dans « Mes achats ».
              </p>
            </details>
            <details className="faq-item">
              <summary className="faq-question">Comment télécharger mes ebooks après achat ?</summary>
              <p className="faq-answer">
                Rendez-vous dans « Mes achats » depuis le menu. Chaque commande affiche un lien de téléchargement pour chaque ebook acheté. Le lien reste disponible tant que vous êtes connecté.
              </p>
            </details>
            <details className="faq-item">
              <summary className="faq-question">Le paiement est-il sécurisé ?</summary>
              <p className="faq-answer">
                Oui. Les paiements sont traités par Stripe (carte bancaire). Aucune donnée de carte n&apos;est stockée sur nos serveurs. La connexion au site est sécurisée (HTTPS).
              </p>
            </details>
            <details className="faq-item">
              <summary className="faq-question">Quel format sont les ebooks ?</summary>
              <p className="faq-answer">
                Les ebooks sont fournis au format PDF, lisibles sur ordinateur, tablette et liseuse. Vous pouvez les télécharger dès que le paiement est confirmé.
              </p>
            </details>
            <details className="faq-item">
              <summary className="faq-question">Puis-je contacter La Muse Éloquente ?</summary>
              <p className="faq-answer">
                Oui. Retrouvez La Muse Éloquente sur les réseaux sociaux (liens en bas de page) pour les actualités, le concours « 2 Minutes pour Convaincre » et toute question.
              </p>
            </details>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-stats">
          <h3 className="footer-stats-title">Chiffres clés</h3>
          <ul className="footer-stats-list">
            <li className="footer-stat">
              <span className="footer-stat-icon">🎤</span>
              <span className="footer-stat-text">+500 personnes accompagnées</span>
            </li>
            <li className="footer-stat footer-stat-social">
              <span className="footer-stat-icons">
                <a href="https://www.instagram.com/la_muse_eloquente?igsh=MXFocTFza3BxcTl2aw%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="https://www.facebook.com/share/1CLiHG45yJ/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.tiktok.com/@mazidath.bello?_r=1&_t=ZN-94DPWz6UPxO" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="TikTok">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
              </span>
              <span className="footer-stat-text">+70.000 abonnés</span>
            </li>
            <li className="footer-stat">
              <span className="footer-stat-icon">🎓</span>
              <span className="footer-stat-text">+100 interventions et formations</span>
            </li>
          </ul>
        </div>
        <p className="footer-brand">La Muse Eloquente – Boutique d&apos;ebooks</p>
        <button type="button" className="footer-legal-link" onClick={() => setView("legal")}>
          Mentions légales et confidentialité
        </button>
      </footer>
    </div>
  );
}

export default App;
