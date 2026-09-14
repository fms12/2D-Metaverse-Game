// =============================================================================
// SIGN UP PAGE (src/pages/SignUpPage.tsx)
// =============================================================================
// Streamlined user registration. If the user clicked a space on the landing
// page, they are immediately taken into that space upon creating their account!
// =============================================================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupApi } from "@/api/auth";
import { findOrCreateSpaceApi } from "@/api/space";
import { useStore } from "@/state/useStore";
import { Button, Input } from "@/components/ui";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { setAuth, pendingSpace, setPendingSpace } = useStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create account & automatically obtain JWT token
      const { token, user } = await signupApi({ username, password });
      setAuth(token, user);

      // 2. If user selected a starter space on the front page, join that shared space!
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
        "Sign up failed. Please try again.";
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
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-metaverse-muted text-sm mt-1">
            {pendingSpace
              ? "Quick 5-second signup to enter your chosen space"
              : "Join the Metaverse — it's free!"}
          </p>
        </div>

        {/* Banner if user selected a starter space on landing page */}
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
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          {/* Error */}
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
            {pendingSpace ? "Sign Up & Enter Space" : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-metaverse-muted mt-4">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="text-metaverse-accent hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
