import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, MousePointerClick, Eye, Share2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const overviewStats = [
  { label: "Total Impressions", value: "124.5K", change: "+12%", up: true, icon: Eye },
  { label: "Engagements", value: "8,432", change: "+18%", up: true, icon: MousePointerClick },
  { label: "Traffic Generated", value: "2,156", change: "+22%", up: true, icon: Users },
  { label: "Shares", value: "892", change: "-3%", up: false, icon: Share2 },
];

const weeklyData = [
  { name: "Mon", impressions: 12000, engagements: 800, traffic: 200 },
  { name: "Tue", impressions: 15000, engagements: 950, traffic: 280 },
  { name: "Wed", impressions: 18000, engagements: 1200, traffic: 350 },
  { name: "Thu", impressions: 14000, engagements: 900, traffic: 220 },
  { name: "Fri", impressions: 22000, engagements: 1500, traffic: 420 },
  { name: "Sat", impressions: 19000, engagements: 1100, traffic: 300 },
  { name: "Sun", impressions: 16000, engagements: 980, traffic: 260 },
];

const platformData = [
  { name: "X (Twitter)", value: 35, color: "hsl(var(--info))" },
  { name: "LinkedIn", value: 28, color: "hsl(var(--primary))" },
  { name: "Instagram", value: 22, color: "hsl(var(--secondary))" },
  { name: "Facebook", value: 15, color: "hsl(var(--success))" },
];

const appPerformance = [
  { name: "AppOne", posts: 24, engagements: 3200, traffic: 820 },
  { name: "AppTwo", posts: 18, engagements: 2800, traffic: 680 },
  { name: "AutoBot", posts: 12, engagements: 2400, traffic: 656 },
];

export default function Analytics() {
  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((stat) => (
            <Card key={stat.label} className="shadow-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-accent p-3">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <span
                      className={`flex items-center text-xs font-medium ${
                        stat.up ? "text-success" : "text-destructive"
                      }`}
                    >
                      {stat.up ? (
                        <TrendingUp className="mr-0.5 h-3 w-3" />
                      ) : (
                        <TrendingDown className="mr-0.5 h-3 w-3" />
                      )}
                      {stat.change}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="platforms">By Platform</TabsTrigger>
            <TabsTrigger value="apps">By App</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Weekly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line type="monotone" dataKey="impressions" stroke="hsl(var(--info))" strokeWidth={2} />
                      <Line type="monotone" dataKey="engagements" stroke="hsl(var(--success))" strokeWidth={2} />
                      <Line type="monotone" dataKey="traffic" stroke="hsl(var(--secondary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-info" />
                    <span className="text-sm text-muted-foreground">Impressions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm text-muted-foreground">Engagements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-secondary" />
                    <span className="text-sm text-muted-foreground">Traffic</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platforms" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display">Platform Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {platformData.map((platform) => (
                      <div key={platform.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: platform.color }} />
                        <span className="text-sm text-muted-foreground">
                          {platform.name} ({platform.value}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display">Platform Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {platformData.map((platform) => (
                      <div key={platform.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{platform.name}</span>
                          <span className="text-muted-foreground">{platform.value}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${platform.value}%`, backgroundColor: platform.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="apps" className="mt-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">App Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={appPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="engagements" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="traffic" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
