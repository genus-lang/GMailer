import { NavLink } from "react-router-dom";
import { 
  Home, 
  Users, 
  FileText, 
  Send, 
  List, 
  CheckCircle, 
  BarChart, 
  Settings, 
  Plus,
  MoreVertical,
  Inbox,
  Bell,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInboxStore } from "@/store/useInboxStore";
import { useStore } from "@/store/useStore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Sidebar() {
  const unreadCount = useInboxStore(state => state.unreadCount);
  const { userEmail, userName, userPicture, settings, disconnect, userPlan, setUpgradeDialogOpen } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const senderName = userName || settings.globalVariables?.senderName || "User";
  const initials = senderName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'U';

  const navItems = [
    { label: "Dashboard", icon: Home, path: "/" },
    { label: "Contacts", icon: Users, path: "/contacts" },
    { label: "Templates", icon: FileText, path: "/templates" },
    { label: "Job Inbox", icon: Inbox, path: "/inbox", badge: unreadCount > 0 ? unreadCount : undefined },
    { label: "Campaigns", icon: Send, path: "/campaigns" },
    { label: "Queue", icon: List, path: "/queue" },
    { label: "Sent", icon: CheckCircle, path: "/sent" },
    { label: "Reports", icon: BarChart, path: "/analytics" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="w-[240px] h-screen bg-card border-r border-border flex flex-col pt-6 pb-4 px-4 sticky top-0 shrink-0">
      {/* Logo and Notification */}
      <div className="flex items-center justify-between px-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
            <Send className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg text-text">GMailer</span>
        </div>

        <Link to="/inbox" className="relative p-1.5 rounded-lg hover:bg-gray-100 text-secondary hover:text-text transition-colors" title="Job Inbox Responses">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-card" />
          )}
        </Link>
      </div>

      {/* New Campaign */}
      <Button className="w-full justify-start gap-2 mb-8 bg-primary hover:bg-primary-hover text-white rounded-button h-12 px-4 shadow-soft">
        <Plus className="w-5 h-5" />
        <span className="font-semibold">New Campaign</span>
      </Button>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                isActive
                  ? "bg-primary-light text-primary"
                  : "text-secondary hover:bg-gray-100 hover:text-text"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-secondary group-hover:text-text")} />
                  {item.label}
                </div>
                {item.badge && (
                  <span className="bg-primary-light text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Upgrade Call to Action / Status */}
      <div className="mt-auto px-2 mb-4">
        {userPlan === 'FREE' ? (
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="font-bold text-sm text-indigo-900">GMailer+</span>
            </div>
            <p className="text-xs text-secondary mb-3">Unlock unlimited AI features and remove all limits.</p>
            <Button 
              onClick={() => setUpgradeDialogOpen(true)}
              className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              Upgrade Now
            </Button>
          </div>
        ) : userPlan === 'PRO' ? (
          <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-200 rounded-xl p-3 flex flex-col gap-2 text-center">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-black text-xs text-indigo-700">GMailer Plus</span>
              </div>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Active</span>
            </div>
            <Button 
              onClick={() => setUpgradeDialogOpen(true, "Upgrade to GMailer Max to get 4,000 recruiters, unlimited contacts, and priority support.")}
              variant="outline"
              className="w-full h-7 text-[10px] uppercase font-bold tracking-wider border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm"
            >
              Upgrade to Max <Sparkles className="w-3 h-3 ml-1 text-purple-500" />
            </Button>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200 rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
              <span className="font-black text-xs text-purple-700">GMailer Max</span>
            </div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Active</span>
          </div>
        )}
      </div>

      {/* User Card */}
      <div className="pt-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  {userPicture ? <img src={userPicture} alt="Profile" className="w-full h-full object-cover rounded-full" /> : <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>}
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text leading-tight line-clamp-1">{senderName}</span>
                  <span className="text-xs text-secondary leading-tight line-clamp-1">{userEmail || "Not connected"}</span>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-secondary flex-shrink-0 ml-2" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white z-[100] shadow-xl border border-border">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { disconnect(); navigate('/'); }} className="text-danger focus:text-danger">
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
