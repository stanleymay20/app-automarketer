import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, Sparkles, BarChart3, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Content",
    description: "Authentic marketing posts tailored to your app's voice and audience.",
  },
  {
    icon: Rocket,
    title: "Full Autopilot",
    description: "Set it and forget it. We create, schedule, and publish automatically.",
  },
  {
    icon: BarChart3,
    title: "Track What Works",
    description: "Simple metrics show if your marketing is driving results.",
  },
];

const plans = [
  {
    name: "Free",
    price: "€0",
    description: "Try it out",
    features: ["1 app", "10 posts/month", "Manual approval"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "€29",
    period: "/mo",
    description: "For indie builders",
    features: ["3 apps", "100 posts/month", "Autopilot ON", "Priority scheduling"],
    cta: "Start Autopilot",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "€79",
    period: "/mo",
    description: "Scale without limits",
    features: ["Unlimited apps", "Unlimited posts", "Autopilot ON", "Priority support"],
    cta: "Go Pro",
    highlighted: false,
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ScrollMarketer" className="h-8 w-8" />
            <span className="font-display text-lg font-bold">
              <span className="text-primary">Scroll</span>
              <span className="text-secondary">Marketer</span>
            </span>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>

          <Link to={user ? "/dashboard" : "/auth"}>
            <Button size="sm">{user ? "Dashboard" : "Start Free"}</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-2xl mx-auto text-center animate-fade-in">
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl xl:text-6xl">
            Your apps. Their marketing.
            <br />
            <span className="text-primary">Fully automated.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-lg mx-auto sm:text-lg">
            ScrollMarketer uses AI to create, schedule, and publish marketing content while you build.
          </p>
          <div className="mt-6 sm:mt-8">
            <Link to={user ? "/dashboard" : "/auth"}>
              <Button size="lg" className="gap-2 bg-success hover:bg-success/90 shadow-lg">
                Start Autopilot Free
                <Rocket className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
            No credit card required · Set up in 2 minutes
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border/50 bg-card/50 py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-display text-2xl font-bold mb-10 lg:text-3xl">
            Marketing that runs itself
          </h2>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="group rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="mb-3 inline-flex rounded-lg bg-accent p-2.5">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1.5 font-display text-base font-semibold text-foreground sm:text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-display text-2xl font-bold mb-2 lg:text-3xl">
            Simple pricing
          </h2>
          <p className="text-center text-muted-foreground mb-10 text-sm sm:text-base">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-5 ${
                  plan.highlighted
                    ? "bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary shadow-lg ring-1 ring-primary/10"
                    : "bg-card border border-border shadow-card"
                }`}
              >
                {plan.highlighted && (
                  <p className="text-[10px] font-bold text-primary mb-1.5 uppercase tracking-wider">Most Popular</p>
                )}
                <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
                <div className="mt-3 mb-4">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <ul className="space-y-1.5 mb-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="h-3.5 w-3.5 text-success shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button
                    className={`w-full text-sm ${plan.highlighted ? "bg-primary shadow-md" : ""}`}
                    variant={plan.highlighted ? "default" : "outline"}
                    size="sm"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="mb-3 font-display text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
          Ready to automate your marketing?
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground sm:text-base">
          Go from sign-up to marketing running in under 5 minutes.
        </p>
        <Link to={user ? "/dashboard" : "/auth"}>
          <Button size="lg" className="gap-2 bg-success hover:bg-success/90 shadow-lg">
            Start Autopilot Free
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ScrollMarketer" className="h-6 w-6" />
            <span className="font-display text-sm font-bold">
              <span className="text-primary">Scroll</span>
              <span className="text-secondary">Marketer</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ScrollMarketer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
