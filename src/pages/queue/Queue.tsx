import { Header } from "@/components/Header/Header";
import { useStore, QueueStatus } from "@/store/useStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, XCircle, Send, Play, Pause, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const getStatusColor = (status: QueueStatus) => {
  switch (status) {
    case 'Sent': return { color: "text-success-light", bg: "bg-green-50", icon: CheckCircle2 };
    case 'Sending': return { color: "text-blue-500", bg: "bg-blue-50", icon: Send };
    case 'Pending': return { color: "text-warning", bg: "bg-amber-50", icon: Clock };
    case 'Failed': return { color: "text-danger", bg: "bg-red-50", icon: XCircle };
    default: return { color: "text-secondary", bg: "bg-gray-100", icon: Clock };
  }
};

export function Queue() {
  const { queueItems, activeCampaign, toggleCampaignStatus } = useStore();
  const [search, setSearch] = useState("");

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel the active campaign? All pending emails will be aborted.")) {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        (chrome.runtime.sendMessage as any)({ type: 'PAUSE_ENGINE' }, () => {
          chrome.storage.local.set({ activeCampaign: null, gmailer_queue: [] });
        });
      }
    }
  };

  const filteredQueue = useMemo(() => {
    return queueItems.filter(item => {
      const e = item.email || "";
      const n = item.name || "";
      return e.toLowerCase().includes(search.toLowerCase()) || n.toLowerCase().includes(search.toLowerCase());
    });
  }, [queueItems, search]);

  return (
    <div className="flex flex-col h-full w-full bg-background relative border-r border-border">
      <Header />
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text mb-1">
              Live Queue 
              {activeCampaign && (
                <span className={cn(
                  "ml-3 text-xs px-2 py-1 rounded-full uppercase tracking-widest",
                  activeCampaign.status === 'Sending' ? "bg-primary-light text-primary" : "bg-warning-light text-warning"
                )}>
                  {activeCampaign.status}
                </span>
              )}
            </h2>
            <p className="text-secondary text-sm">Detailed view of your active campaign queue.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input 
                placeholder="Search by name or email..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            {activeCampaign && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 gap-2"
                  onClick={toggleCampaignStatus}
                >
                  {activeCampaign.status === 'Sending' ? (
                    <><Pause className="w-4 h-4" /> Pause</>
                  ) : (
                    <><Play className="w-4 h-4" /> Resume</>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 gap-2 text-danger hover:text-danger hover:bg-danger-light border-danger/20"
                  onClick={handleCancel}
                >
                  <Square className="w-4 h-4" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {!activeCampaign ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
            <Clock className="w-12 h-12 text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-text mb-2">Queue is Empty</h3>
            <p className="text-secondary text-sm max-w-md">
              There is no active campaign running right now. Start a new campaign from the Dashboard to see emails populate here.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Recipient</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-secondary text-sm">No recipients match your search.</td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => {
                    const { bg, color, icon: Icon } = getStatusColor(item.status);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-border">
                              <AvatarFallback className="bg-white font-medium text-secondary text-xs">
                                {(item.name || item.email || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-text leading-tight">{item.name || "Unknown"}</span>
                              <span className="text-xs text-secondary leading-tight mt-0.5">{item.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full", bg, color)}>
                            <Icon className="w-3.5 h-3.5" />
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-secondary">{item.time}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
