import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Zap, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "App-Specific Content",
    description: "Social pilot marketer schedule",
    color: "from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
  },
  {
    icon: Zap,
    title: "Autopilot Mode",
    description: "Deploy your latest marketer contents.",
    badge: "ON",
    color: "from-success/20 to-success/5",
    iconColor: "text-success",
  },
  {
    icon: BarChart3,
    title: "Performance Dashboard",
    description: "Reports summarized past 30+ days.",
    color: "from-info/20 to-info/5",
    iconColor: "text-info",
  },
];

export function FeatureCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {features.map((feature) => (
        <Card
          key={feature.title}
          className={`relative overflow-hidden bg-gradient-to-br ${feature.color} shadow-card transition-all hover:shadow-card-hover`}
        >
          <CardContent className="flex items-start gap-4 p-5">
            <div className={`rounded-lg bg-card p-2 shadow-sm`}>
              <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-foreground">
                  {feature.title}
                </h3>
                {feature.badge && (
                  <span className="rounded bg-success px-1.5 py-0.5 text-[10px] font-bold text-success-foreground">
                    {feature.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
