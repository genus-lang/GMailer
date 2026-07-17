import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Dashboard } from "@/pages/dashboard/Dashboard";
import { Contacts } from "@/pages/contacts/Contacts";
import { CampaignBuilder } from "@/pages/campaigns/CampaignBuilder";
import { Campaigns } from "@/pages/campaigns/Campaigns";
import { Templates } from "@/pages/templates/Templates";
import { Analytics } from "@/pages/analytics/Analytics";
import { Settings } from "@/pages/settings/Settings";
import { Queue } from "@/pages/queue/Queue";
import { Sent } from "@/pages/sent/Sent";
import { JobInbox } from "@/pages/inbox/JobInbox";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";

export function App() {
  const syncWithStorage = useStore(state => state.syncWithStorage);
  const isConnected = useStore(state => state.isConnected);

  useEffect(() => {
    syncWithStorage();
    
    // Poll every 3 seconds to provide real-time Queue updates
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        syncWithStorage();
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [syncWithStorage, isConnected]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="templates" element={<Templates />} />
          <Route path="inbox" element={<JobInbox />} />
          <Route path="campaigns/new" element={<CampaignBuilder />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="queue" element={<Queue />} />
          <Route path="sent" element={<Sent />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
