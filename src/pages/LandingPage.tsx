import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle, Loader2, Zap, Target, TrendingUp, Shield, Sparkles, Layers, Rocket, Clock, Users, Check, ArrowRight } from "lucide-react";

const ICONS: Record<string, any> = {
  zap: Zap, target: Target, trendingUp: TrendingUp, shield: Shield,
  sparkles: Sparkles, layers: Layers, rocket: Rocket, clock: Clock,
  users: Users, check: Check,
};

type Feature = { title: string; description: string; icon?: string };
type Proof = { kind: "quote"; quote: string; author?: string; role?: string } | { kind: "stat"; value: string; label: string };
type Objection = { question: string; answer: string };

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
        .rpc("get_public_landing", { _slug: slug! })
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-slate-500">Page not found</p>
      </div>
    );
  }

  const brand = (app.landing_brand_color as string) || "#0f172a";
  const features = (app.landing_features as any as Feature[]) || [];
  const proof = (app.landing_proof as any as Proof[]) || [];
  const objections = (app.landing_objections as any as Objection[]) || [];

  const scrollToCta = () => {
    document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ ["--brand" as any]: brand }}>
      {/* Top bar */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg" style={{ backgroundColor: brand }} />
            <span className="font-semibold tracking-tight">{app.name}</span>
          </div>
          <Button size="sm" onClick={scrollToCta} className="text-white" style={{ backgroundColor: brand }}>
            {app.landing_cta_label || "Get early access"}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pt-16 pb-12 sm:pt-24 sm:pb-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border border-slate-200 text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brand }} />
            New
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-slate-900">
            {app.landing_headline || app.name}
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {app.landing_subheadline || app.description || `Built for ${app.target_audience || "you"}`}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={scrollToCta} className="text-white gap-2" style={{ backgroundColor: brand }}>
              {app.landing_cta_label || "Get early access"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500">Free to try. No credit card.</p>
        </div>
      </section>

      {/* Features */}
      {features.length > 0 && (
        <section className="px-5 py-12 sm:py-16 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {features.slice(0, 3).map((f, i) => {
                const Icon = ICONS[f.icon || "check"] || Check;
                return (
                  <div key={i} className="space-y-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${brand}14`, color: brand }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-base leading-snug">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Social proof */}
      {proof.length > 0 && (
        <section className="px-5 py-12 sm:py-16 bg-slate-50 border-y border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proof.map((p, i) => {
                if ((p as any).kind === "stat") {
                  const s = p as any;
                  return (
                    <Card key={i} className="p-6 text-center border-slate-200 shadow-none">
                      <div className="text-3xl font-bold" style={{ color: brand }}>{s.value}</div>
                      <div className="text-sm text-slate-600 mt-1">{s.label}</div>
                    </Card>
                  );
                }
                const q = p as any;
                return (
                  <Card key={i} className="p-6 border-slate-200 shadow-none">
                    <p className="text-sm text-slate-800 leading-relaxed">"{q.quote}"</p>
                    {(q.author || q.role) && (
                      <p className="text-xs text-slate-500 mt-3">
                        {q.author}{q.author && q.role ? " · " : ""}{q.role}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Objections / FAQ */}
      {objections.length > 0 && (
        <section className="px-5 py-12 sm:py-16">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-center">Questions, answered.</h2>
            <div className="space-y-4">
              {objections.map((o, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-900">{o.question}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{o.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA / lead capture */}
      <section id="cta" className="px-5 py-16 sm:py-24 border-t border-slate-100">
        <div className="max-w-md mx-auto space-y-6">
          {submitted ? (
            <Card className="p-8 text-center space-y-3 border-slate-200">
              <CheckCircle className="h-12 w-12 mx-auto" style={{ color: brand }} />
              <p className="font-semibold text-slate-900 text-lg">You're in.</p>
              <p className="text-sm text-slate-600">We'll be in touch soon.</p>
            </Card>
          ) : (
            <Card className="p-7 border-slate-200">
              <div className="space-y-1 mb-5 text-center">
                <h3 className="font-bold text-xl">Start now</h3>
                <p className="text-sm text-slate-600">Takes less than a minute.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
                <Input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full h-11 text-white" disabled={loading} style={{ backgroundColor: brand }}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {app.landing_cta_label || "Get early access"}
                </Button>
              </form>
              <p className="text-xs text-slate-500 text-center mt-4">No spam. Unsubscribe anytime.</p>
            </Card>
          )}
        </div>
      </section>

      <footer className="px-5 py-8 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} {app.name}</p>
      </footer>
    </div>
  );
}
