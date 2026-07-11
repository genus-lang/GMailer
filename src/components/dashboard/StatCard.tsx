import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtext?: string;
  color: "primary" | "success" | "warning" | "danger";
}

const colorConfig = {
  primary: {
    icon: "text-indigo-600",
    bg: "bg-indigo-50",
    bar: "bg-indigo-500",
    glow: "shadow-indigo-100",
  },
  success: {
    icon: "text-emerald-600",
    bg: "bg-emerald-50",
    bar: "bg-emerald-500",
    glow: "shadow-emerald-100",
  },
  warning: {
    icon: "text-amber-600",
    bg: "bg-amber-50",
    bar: "bg-amber-500",
    glow: "shadow-amber-100",
  },
  danger: {
    icon: "text-red-500",
    bg: "bg-red-50",
    bar: "bg-red-500",
    glow: "shadow-red-100",
  },
};

export function StatCard({ icon: Icon, title, value, subtext, color }: StatCardProps) {
  const cfg = colorConfig[color];
  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border flex flex-col items-start p-5 shadow-soft hover:shadow-md transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 group",
      cfg.glow
    )}>
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", cfg.bg)}>
        <Icon className={cn("w-5 h-5", cfg.icon)} />
      </div>
      <div className="text-3xl font-black text-text mb-0.5 leading-none tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs font-semibold text-secondary">{title}</span>
        {subtext && (
          <span className={cn("text-xs font-bold", cfg.icon)}>{subtext}</span>
        )}
      </div>
      {/* Bottom accent bar */}
      <div className={cn("h-0.5 w-8 rounded-full mt-3 opacity-60 group-hover:w-12 transition-all duration-300", cfg.bar)} />
    </div>
  );
}
