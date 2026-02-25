import React, { useState } from "react";
import { register } from "../api/auth";
import { useAuth } from "../store/AuthContext";

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.includes("@")) return false;
  const [local, domain] = trimmed.split("@");
  return local.length > 0 && domain.length > 0 && domain.includes(".");
}

function isStrongPassword(value: string): boolean {
  if (value.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  return hasLetter && hasNumber;
}

type Props = {
  onSuccess?: () => void;
};

const RegisterPage: React.FC<Props> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    if (!isStrongPassword(password)) {
      setError("Choisissez un mot de passe plus fort : au moins 8 caractères, avec des lettres et des chiffres.");
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, firstName, lastName);
      await login(email.trim(), password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError("Impossible de créer le compte. Essayez un autre email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h1 className="card-title">Créer un compte</h1>
        <p className="card-subtitle">
          Accède à tes ebooks depuis n&apos;importe quel appareil une fois connecté.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Prénom</label>
            <input
              className="input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Nom</label>
            <input
              className="input"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
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
            <p className="form-hint">
              Utilisez au moins 8 caractères, avec des lettres et des chiffres, pour un mot de passe sécurisé.
            </p>
          </div>
          {error && <p className="error">{error}</p>}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;


