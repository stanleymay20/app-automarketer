import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "AppOne", traffic: 2, engagement: 5 },
  { name: "AppTwo", traffic: 8, engagement: 12 },
  { name: "AppOne", traffic: 15, engagement: 18 },
  { name: "AutTwo", traffic: 25, engagement: 22 },
  { name: "AutoBot", traffic: 35, engagement: 40 },
];

export function PerformanceSummary() {
  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="font-display text-lg font-semibold">
          Weekly Performance Summary
        </CardTitle>
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-info" />
            <span className="text-sm text-muted-foreground">Engagement</span>
            <span className="flex items-center text-sm font-semibold text-success">
              +18%
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-sm text-muted-foreground">Traffic</span>
            <span className="flex items-center text-sm font-semibold text-success">
              +22%
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="engagement"
                stroke="hsl(var(--info))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--info))", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="traffic"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">App Traffic</p>
      </CardContent>
    </Card>
  );
}
