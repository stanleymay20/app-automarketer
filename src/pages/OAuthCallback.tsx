import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const platformLabels: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
};

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const platform = searchParams.get("platform") ?? searchParams.get("connected") ?? "platform";
  const status =
    searchParams.get("status") ??
    (searchParams.get("error") ? "error" : searchParams.get("connected") ? "success" : "pending");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const appId = searchParams.get("app_id");
  const platformLabel = platformLabels[platform] ?? "Platform";

  const settingsTarget = useMemo(() => {
    const params = new URLSearchParams({ tab: "platforms" });

    if (status === "success") {
      params.set("connected", platform);
    }

    if (error) {
      params.set("error", error);
    }

    if (appId) {
      params.set("app_id", appId);
    }

    return `/settings?${params.toString()}`;
  }, [appId, error, platform, status]);

  useEffect(() => {
    console.info("[OAuthCallback] callback page loaded", {
      href: window.location.href,
      platform,
      status,
      error,
      errorDescription,
      hasUser: !!user,
      loading,
    });
  }, [error, errorDescription, loading, platform, status, user]);

  useEffect(() => {
    if (loading) return;

    if (status === "success" && user) {
      const timer = window.setTimeout(() => {
        navigate(settingsTarget, { replace: true });
      }, 1200);

      return () => window.clearTimeout(timer);
    }

    if (status === "error") {
      const timer = window.setTimeout(() => {
        navigate(settingsTarget, { replace: true });
      }, 2200);

      return () => window.clearTimeout(timer);
    }
  }, [loading, navigate, settingsTarget, status, user]);

  const isSuccess = status === "success";
  const isError = status === "error";
  const isRecoveringSession = isSuccess && loading;
  const needsSignIn = isSuccess && !loading && !user;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {isSuccess ? (
            isRecoveringSession ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-10 w-10 text-primary" />
            )
          ) : isError ? (
            <AlertCircle className="h-10 w-10 text-destructive" />
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {isSuccess
                ? isRecoveringSession
                  ? `Restoring ${platformLabel} connection`
                  : `Connected to ${platformLabel}`
                : isError
                  ? `${platformLabel} connection failed`
                  : `Finishing ${platformLabel} connection`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSuccess
                ? isRecoveringSession
                  ? "Please wait while we restore your session and return you to Settings."
                  : needsSignIn
                    ? "The callback finished, but this browser is not signed in on the published app yet."
                    : "Connection complete. Sending you back to Settings now."
                : isError
                  ? "We received a callback error and will return you to Settings with the details."
                  : "We are processing the provider response."}
            </p>
          </div>
        </div>

        {(isError || needsSignIn) && (
          <Alert variant={isError ? "destructive" : "default"} className="mb-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{isError ? "Callback details" : "Sign in required"}</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                {error && <p><strong>Error:</strong> {error}</p>}
                {errorDescription && <p><strong>Provider detail:</strong> {errorDescription}</p>}
                {needsSignIn && (
                  <p>
                    Sign in on the published app, then open Settings → Platforms again to finish linking your account.
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={() => navigate(settingsTarget, { replace: true })}>
            Go to Settings
          </Button>
          {needsSignIn && (
            <Button className="flex-1" variant="outline" onClick={() => navigate("/auth", { replace: true })}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
