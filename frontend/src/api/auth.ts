// =============================================================================
// AUTH API FUNCTIONS (src/api/auth.ts)
// =============================================================================
// These functions call our FastAPI authentication endpoints:
//   POST /api/v1/signup  — Register new account (expects: { username, password, type })
//   POST /api/v1/signin  — Login and receive JWT token
// =============================================================================

import apiClient from "./client";
import type { AuthUser } from "@/state/useStore";

export interface SignupPayload {
  username: string;
  password: string;
  role?: "admin" | "user"; // Mapped to `type` for FastAPI
}

export interface SigninPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
}

// =============================================================================
// HELPER: Decode JWT Token Payload
// =============================================================================
// JWT is format: header.payload.signature
// The payload contains: { "sub": "<userId>", "role": "admin" | "user", "exp": ... }
// We decode it client-side without any third-party libraries.
// =============================================================================
function parseJwtPayload(
  token: string,
): { sub?: string; role?: "admin" | "user" } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// =============================================================================
// SIGNIN FUNCTION
// POST /api/v1/signin
// Returns: { token: "..." }
// =============================================================================
export async function signinApi(
  payload: SigninPayload,
): Promise<AuthResponse & { user: AuthUser }> {
  const { data } = await apiClient.post<{ token: string }>(
    "/api/v1/signin",
    payload,
  );
  const token = data.token;

  // Extract userId and real role from the cryptographically signed JWT token
  const decoded = parseJwtPayload(token);
  const userId = decoded?.sub || "";
  const role: "admin" | "user" = decoded?.role === "admin" ? "admin" : "user";

  return {
    token,
    userId,
    user: {
      id: userId,
      username: payload.username,
      role,
    },
  };
}

// =============================================================================
// SIGNUP FUNCTION
// POST /api/v1/signup
// Backend expects: { username, password, type: "user" | "admin" }
// Returns: { userId: "..." }
// We then immediately sign in to retrieve the JWT token and decoded user profile.
// =============================================================================
export async function signupApi(
  payload: SignupPayload,
): Promise<AuthResponse & { user: AuthUser }> {
  // Step 1: Register account (FastAPI schema uses field name `type`, not `role`)
  await apiClient.post<{ userId: string }>("/api/v1/signup", {
    username: payload.username,
    password: payload.password,
    type: payload.role ?? "user",
  });

  // Step 2: Auto-signin to acquire the JWT token & decoded claims
  return signinApi({
    username: payload.username,
    password: payload.password,
  });
}
