import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  AppWindow, 
  FileText, 
  Calendar, 
  BarChart3, 
  Settings,
  Bell,
  HelpCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import logo from "@/assets/logo.png";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: AppWindow, label: "Apps", path: "/apps" },
  { icon: FileText, label: "Content", path: "/content" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const [approvalMode, setApprovalMode] = useState(true);
  const [autopilot, setAutopilot] = useState(false);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5">
        <img src={logo} alt="ScrollMarketer" className="h-10 w-10" />
        <div className="font-display text-xl font-bold">
          <span className="text-primary">Scroll</span>
          <span className="text-secondary">Marketer</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-info")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mode toggles */}
      <div className="border-t border-sidebar-border p-4 space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Approval Mode</span>
          </div>
          <Switch
            checked={approvalMode}
            onCheckedChange={setApprovalMode}
            className="data-[state=checked]:bg-info"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Switch to Autopilot</span>
            <span className="rounded bg-secondary/20 px-2 py-0.5 text-xs font-semibold text-secondary">
              Sonic
            </span>
          </div>
          <Switch
            checked={autopilot}
            onCheckedChange={setAutopilot}
            className="data-[state=checked]:bg-secondary"
          />
        </div>
      </div>
    </aside>
  );
}
