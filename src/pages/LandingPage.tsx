import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Rocket, CheckCircle, Loader2 } from "lucide-react";

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const sourceContentId = searchParams.get("c");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: app, isLoading } = useQuery({
    queryKey: ["landing-app", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select("id, name, description, landing_headline, landing_subheadline, landing_cta_label, landing_enabled, target_audience")
        .eq("landing_slug", slug!)
        .eq("landing_enabled", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("capture-lead", {
        body: { slug, email, name, source_content_id: sourceContentId, platform: "landing_page" },
      });
      if (fnErr) throw fnErr;
      if (data?.error && !data?.duplicate) throw new Error(data.error);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-accent/30 px-4 py-12">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {app.landing_headline || app.name}
        </h1>

        <p className="text-lg text-muted-foreground">
          {app.landing_subheadline || app.description || `Built for ${app.target_audience || "you"}`}
        </p>

        {submitted ? (
          <Card className="p-6 space-y-3 bg-success/10 border-success/20">
            <CheckCircle className="h-10 w-10 text-success mx-auto" />
            <p className="font-semibold text-foreground">You're in! 🎉</p>
            <p className="text-sm text-muted-foreground">We'll be in touch soon.</p>
          </Card>
        ) : (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {app.landing_cta_label || "Get early access"}
              </Button>
            </form>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}
