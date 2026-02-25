import React, { useState } from "react";
import { useAuth } from "../store/AuthContext";

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.includes("@")) return false;
  const [local, domain] = trimmed.split("@");
  return local.length > 0 && domain.length > 0 && domain.includes(".");
}

type Props = {
  onSuccess?: () => void;
  onBack?: () => void;
};

const LoginPage: React.FC<Props> = ({ onSuccess, onBack }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Veuillez entrer une adresse email valide (ex. nom@exemple.com).");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {onBack && (
        <header className="navbar">
          <div className="navbar-inner">
            <button type="button" className="brand auth-page-brand" onClick={onBack}>
              <span className="brand-title">La Muse Eloquente</span>
            </button>
          </div>
        </header>
      )}
      <div className="page-center">
        <div className="card">
        <h1 className="card-title">Connexion</h1>
        <p className="card-subtitle">Reviens sur ta bibliothèque et poursuis tes achats.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">Mot de passe</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          {onBack && (
            <button type="button" className="btn btn-ghost" onClick={onBack} style={{ width: "100%", justifyContent: "center", marginTop: "0.75rem" }}>
              Retour à l&apos;accueil
            </button>
          )}
        </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;