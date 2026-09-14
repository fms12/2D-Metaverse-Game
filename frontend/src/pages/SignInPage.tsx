// =============================================================================
// SIGN IN PAGE (src/pages/SignInPage.tsx)
// =============================================================================
// User login with optional pending space redirect.
// =============================================================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signinApi } from "@/api/auth";
import { findOrCreateSpaceApi } from "@/api/space";
import { useStore } from "@/state/useStore";
import { Button, Input } from "@/components/ui";

export default function SignInPage() {
  const navigate = useNavigate();
  const { setAuth, pendingSpace, setPendingSpace } = useStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Authenticate with backend
      const { token, user } = await signinApi({ username, password });
      setAuth(token, user);

      // 2. If a starter space was selected on the landing page, enter it directly!
      if (pendingSpace) {
        try {
          const { spaceId } = await findOrCreateSpaceApi({
            name: pendingSpace.name,
            width: pendingSpace.width,
            height: pendingSpace.height,
          });
          setPendingSpace(null);
          navigate(`/game/${spaceId}`);
          return;
        } catch {
          setPendingSpace(null);
          navigate("/dashboard");
          return;
        }
      }

      // Default: Go to dashboard
      navigate("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const message =
        axiosErr.response?.data?.detail ??
        axiosErr.message ??
        "Sign in failed. Please check your credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-metaverse-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 bg-metaverse-accent rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 cursor-pointer shadow-lg shadow-metaverse-accent/30"
            onClick={() => navigate("/")}
          >
            M
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-metaverse-muted text-sm mt-1">
            {pendingSpace
              ? `Sign in to enter ${pendingSpace.name}`
              : "Sign in to your account"}
          </p>
        </div>

        {/* Banner if user selected a starter space */}
        {pendingSpace && (
          <div className="mb-6 glass-card p-4 border-metaverse-accent/40 bg-metaverse-accent/10 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{pendingSpace.icon || "🏢"}</span>
              <div>
                <p className="text-xs text-metaverse-accent font-semibold uppercase tracking-wider">
                  Target Destination
                </p>
                <h4 className="text-white font-bold text-sm">
                  {pendingSpace.name}
                </h4>
                <p className="text-xs text-metaverse-muted">
                  {pendingSpace.width} × {pendingSpace.height} tiles
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingSpace(null)}
              className="text-xs text-metaverse-muted hover:text-white px-2 py-1"
            >
              Change
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="rounded-lg bg-metaverse-danger/10 border border-metaverse-danger/30 px-4 py-3 text-sm text-metaverse-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
          >
            {pendingSpace ? `Sign In & Enter Space 🚀` : `Sign In`}
          </Button>
        </form>

        <p className="text-center text-sm text-metaverse-muted mt-4">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-metaverse-accent hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
