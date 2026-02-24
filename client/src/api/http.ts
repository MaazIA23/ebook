import axios from "axios";

const env = import.meta.env as { DEV?: boolean; VITE_API_URL?: string };
const API_BASE_ORIGIN = env.VITE_API_URL ?? "http://localhost:8000";
/** En dev, on passe par le proxy Vite (/api et /static) pour éviter les soucis CORS. */
const API_BASE = env.DEV ? "/api" : API_BASE_ORIGIN;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/** URL de base pour les assets (images) : en dev = même origine (proxy /static), en prod = API. */
export function getApiBaseUrl(): string {
  return env.DEV ? "" : API_BASE_ORIGIN.replace(/\/$/, "");
}

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}
