import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, BarChart3, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const features = [
  {
    icon: Sparkles,
    title: "Smart Content Creation",
    description: "AI creates authentic social content tailored to each of your apps.",
  },
  {
    icon: Zap,
    title: "Autopilot or Approval Mode",
    description: "Choose full automation or review every post before publishing.",
  },
  {
    icon: BarChart3,
    title: "Results-Driven Analytics",
    description: "Track engagement, traffic, and performance with AI insights.",
  },
];

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ScrollMarketer" className="h-10 w-10" />
            <span className="font-display text-xl font-bold">
              <span className="text-primary">Scroll</span>
              <span className="text-secondary">Marketer</span>
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <Link to={user ? "/dashboard" : "/auth"}>
            <Button>{user ? "Dashboard" : "Sign Up"}</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6 animate-fade-in">
            <h1 className="font-display text-4xl font-bold leading-tight text-foreground lg:text-5xl xl:text-6xl">
              Automate Marketing
              <br />
              <span className="text-primary">for All Your Apps</span>
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Let <span className="font-semibold text-foreground">ScrollMarketer</span> handle
              your app marketing with intelligent AI that creates, posts, and optimizes for you.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={user ? "/dashboard" : "/auth"}>
                <Button size="lg" className="gap-2 bg-info hover:bg-info/90">
                  {user ? "Go to Dashboard" : "Start Free Trial"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                See in Action
              </Button>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="relative mx-auto max-w-md">
              <img
                src={logo}
                alt="ScrollMarketer Hero"
                className="h-auto w-full drop-shadow-2xl"
              />
              {/* Floating UI Preview */}
              <div className="absolute -right-4 top-4 w-48 animate-slide-in-left rounded-xl bg-card p-4 shadow-xl" style={{ animationDelay: "0.3s" }}>
                <p className="text-xs font-semibold text-foreground">App Marketing Overview</p>
                <p className="text-[10px] text-success">Autopilot Enabled</p>
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-info/30">
                    <div className="h-1.5 w-3/4 rounded-full bg-info" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border/50 bg-card/50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="group rounded-2xl bg-card p-8 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="mb-4 inline-flex rounded-xl bg-accent p-3">
                  <feature.icon className="h-6 w-6 text-info" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="mb-4 font-display text-3xl font-bold text-foreground lg:text-4xl">
          Ready to automate your marketing?
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
          Join thousands of app creators who trust ScrollMarketer to grow their audience.
        </p>
        <Link to={user ? "/dashboard" : "/auth"}>
          <Button size="lg" className="gap-2">
            {user ? "Go to Dashboard" : "Get Started Free"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ScrollMarketer" className="h-8 w-8" />
            <span className="font-display text-lg font-bold">
              <span className="text-primary">Scroll</span>
              <span className="text-secondary">Marketer</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 ScrollMarketer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
