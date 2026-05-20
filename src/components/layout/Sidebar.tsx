import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  AppWindow,
  FileText,
  Calendar,
  BarChart3,
  Mail,
  Settings,
  Bell,
  LogOut,
  Send,
  DollarSign,
  Landmark,
  Users,
  Lightbulb,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import logo from "@/assets/logo.png";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Users, label: "Audience", path: "/audience" },
  { icon: FileText, label: "Create Post", path: "/create" },
  { icon: AppWindow, label: "Campaigns", path: "/content" },
  { icon: BarChart3, label: "Performance", path: "/analytics" },
  { icon: Lightbulb, label: "Intelligence", path: "/intelligence" },
  { icon: DollarSign, label: "Revenue", path: "/revenue" },
  { icon: Landmark, label: "Funding", path: "/funding" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const handleApprovalModeChange = (checked: boolean) => {
    updateSettings.mutate({
      approval_mode: checked,
      autopilot_mode: !checked,
    });
  };

  const handleAutopilotChange = (checked: boolean) => {
    updateSettings.mutate({
      autopilot_mode: checked,
      approval_mode: !checked,
    });
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-in-out",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo + close */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="ScrollMarketer" className="h-9 w-9" />
          <div className="font-display text-lg font-bold leading-tight">
            <span className="text-primary">Scroll</span>
            <span className="text-secondary">Marketer</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-info")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mode toggles */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-accent/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Approval</span>
          </div>
          <Switch
            checked={settings?.approval_mode ?? true}
            onCheckedChange={handleApprovalModeChange}
            className="data-[state=checked]:bg-info scale-90"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Autopilot</span>
            {settings?.autopilot_mode && (
              <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                ON
              </span>
            )}
          </div>
          <Switch
            checked={settings?.autopilot_mode ?? false}
            onCheckedChange={handleAutopilotChange}
            className="data-[state=checked]:bg-secondary scale-90"
          />
        </div>

        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
