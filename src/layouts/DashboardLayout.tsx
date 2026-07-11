import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { UpgradeDialog } from "@/features/billing/UpgradeDialog";

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-text">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <UpgradeDialog />
    </div>
  );
}
