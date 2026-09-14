// =============================================================================
// AXIOS HTTP CLIENT (src/api/client.ts)
// =============================================================================
// This file creates a configured Axios instance that ALL our API calls use.
//
// 🎓 WHAT IS AXIOS?
// Axios is an HTTP client library for making API calls from the browser.
// You could use the built-in browser fetch() API, but Axios has better:
//   - Automatic JSON parsing (no need to call response.json())
//   - Better error handling (throws errors for 4xx/5xx status codes)
//   - Interceptors (middleware for requests and responses)
//   - Request cancellation support
//
// 🎓 FASTAPI EQUIVALENT MAPPING:
// Browser (Axios)                          FastAPI Backend
// ─────────────────────────────────────    ─────────────────────────────────────
// axios.post('/api/v1/signin', data)    →  POST /api/v1/signin
// axios.get('/api/v1/space/all')        →  GET /api/v1/space/all
// Authorization: Bearer <token>         →  Dependency: get_current_user(token)
// axios throws AxiosError               ←  FastAPI returns HTTPException
//
// 🎓 WHAT ARE INTERCEPTORS?
// An interceptor is like MIDDLEWARE for HTTP requests.
// In FastAPI: def get_current_user(token = Depends(oauth2_scheme))
// In Axios:   request interceptor automatically adds "Authorization: Bearer <token>"
//
// Without interceptor:       With interceptor:
//   axios.get('/space', {      axios.get('/space') // Clean!
//     headers: { Authorization: `Bearer ${token}` }
//   })
// =============================================================================

import axios from "axios";
import { useStore } from "@/state/useStore";

// =============================================================================
// CREATE AXIOS INSTANCE
// =============================================================================
// Instead of using axios directly (which has no base URL or interceptors),
// we create our own configured instance.
// Think of it as creating a "pre-configured phone" that already knows
// the backend's number and always introduces itself properly.
// =============================================================================
const apiClient = axios.create({
  // 🎓 baseURL: All requests will prepend this URL.
  // axios.get('/space/all') becomes: GET http://localhost:8000/api/v1/space/all
  // This matches the Vite proxy config — /api is forwarded to localhost:8000
     baseURL: import.meta.env.VITE_API_URL || "",

  // 🎓 headers: Default headers sent with EVERY request.
  headers: {
    "Content-Type": "application/json",
  },

  // 🎓 timeout: If the server doesn't respond in 10 seconds, throw an error.
  // Without this, a dead server would make the user wait forever.
  timeout: 10000,
});

// =============================================================================
// REQUEST INTERCEPTOR — Automatically attach JWT token
// =============================================================================
// This runs BEFORE every request is sent.
// We read the token from Zustand store and add it to the Authorization header.
//
// 🎓 WHY NOT JUST PASS TOKEN MANUALLY?
// Every protected API call needs the token. Without an interceptor,
// every API function would need:
//   const token = useStore.getState().token;
//   axios.get('/space', { headers: { Authorization: `Bearer ${token}` } })
//
// With the interceptor, every call is automatic!
// =============================================================================
apiClient.interceptors.request.use(
  (config) => {
    // Get the current token directly from Zustand store.
    // Note: we use useStore.getState() (not useStore() hook) because
    // interceptors are NOT React components — they can't use hooks.
    const token = useStore.getState().token;

    if (token) {
      // Add the Bearer token to every request that has a token
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Always return the config (possibly modified) to continue the request
    return config;
  },
  (error) => {
    // If something went wrong BEFORE the request was sent, reject with the error
    return Promise.reject(error);
  },
);

// =============================================================================
// RESPONSE INTERCEPTOR — Handle auth errors globally
// =============================================================================
// This runs AFTER every response is received.
// If the server returns 401 (Unauthorized) or 403 (Forbidden),
// it means our JWT token is expired or invalid.
// We automatically log the user out and redirect to sign-in.
// =============================================================================
apiClient.interceptors.response.use(
  // SUCCESS: Return the response as-is
  (response) => response,

  // ERROR: Handle HTTP errors
  (error) => {
    if (error.response) {
      // The server responded with an error status code
      const { status } = error.response;

      if (status === 401 || status === 403) {
        // Token is expired or invalid — log the user out
        // This clears the token from Zustand store AND localStorage
        useStore.getState().logout();

        // Redirect to sign-in page (using window.location for simplicity
        // since we're outside React component scope)
        window.location.href = "/signin";
      }
    }

    // Re-throw the error so individual API calls can handle it too
    return Promise.reject(error);
  },
);

export default apiClient;
