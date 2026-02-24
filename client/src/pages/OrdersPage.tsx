import { useEffect, useState } from "react";
import { api } from "../api/http";

type OrderItem = {
  product_id: number;
  product_title: string;
  price_cents: number;
};

type Order = {
  id: number;
  status: string;
  total_cents: number;
  items: OrderItem[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const res = await api.get<Order[]>("/orders/");
        setOrders(res.data);
      } catch {
        setError("Impossible de récupérer vos commandes.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function download(productId: number) {
    try {
      const res = await api.get<{ product_id: number; url: string }>(`/downloads/${productId}`);
      const url = res.data.url.startsWith("http")
        ? res.data.url
        : `${api.defaults.baseURL?.replace(/\/+$/, "")}${res.data.url}`;
      window.open(url, "_blank");
    } catch {
      alert("Téléchargement impossible. Assurez-vous que la commande est payée.");
    }
  }

  if (loading) {
    return (
      <div className="page-center">
        <div className="card" style={{ maxWidth: 360 }}>
          <p style={{ margin: 0 }}>Chargement de vos commandes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-center">
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 className="card-title">Mes achats</h2>
          <p className="error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">Mes achats</h2>
      <p className="section-subtitle">
        Retrouvez vos commandes. Le téléchargement est disponible pour les commandes payées.
      </p>
      {orders.length === 0 ? (
        <div className="card" style={{ maxWidth: 520 }}>
          <p style={{ margin: 0 }}>Aucune commande pour le moment.</p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <div className="order-id">Commande #{order.id}</div>
                  <div className="order-status">
                    Statut: <strong>{order.status}</strong>
                  </div>
                </div>
                <div className="order-total">{(order.total_cents / 100).toFixed(2)} €</div>
              </div>
              <div className="order-items">
                {order.items.map((it, idx) => (
                  <div key={`${order.id}-${it.product_id}-${idx}`} className="order-item">
                    <div>{it.product_title || `Produit #${it.product_id}`}</div>
                    <div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => download(it.product_id)}
                        disabled={order.status !== "paid"}
                      >
                        Télécharger
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
