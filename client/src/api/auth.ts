import { api } from "./http";

export type User = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

export async function register(
  email: string,
  password: string,
  first_name?: string,
  last_name?: string
): Promise<User> {
  const res = await api.post("/auth/register", { email, password, first_name, last_name });
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await api.get("/auth/me");
  return res.data;
}