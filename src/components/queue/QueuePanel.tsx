import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useStore, QueueStatus, QueueItem } from "@/store/useStore";
import { useMemo } from "react";

const getStatusColor = (status: QueueStatus) => {
  switch (status) {
    case 'Sent': return { color: "text-success-light", bg: "bg-green-50" };
    case 'Sending': return { color: "text-blue-500", bg: "bg-blue-50" };
    case 'Pending': return { color: "text-warning", bg: "bg-amber-50" };
    case 'Failed': return { color: "text-danger", bg: "bg-red-50" };
    default: return { color: "text-secondary", bg: "bg-gray-100" };
  }
};

export function QueuePanel() {
  const { queueItems, queueFilter, setQueueFilter, activeCampaign } = useStore();

  const filteredItems = useMemo(() => {
    if (queueFilter === 'all') return queueItems;
    if (queueFilter === 'sent') return queueItems.filter(i => i.status === 'Sent');
    if (queueFilter === 'pending') return queueItems.filter(i => i.status === 'Pending' || i.status === 'Sending');
    if (queueFilter === 'failed') return queueItems.filter(i => i.status === 'Failed');
    return queueItems;
  }, [queueItems, queueFilter]);
  
  const progressPercent = activeCampaign ? Math.round((activeCampaign.sent / activeCampaign.total) * 100) : 0;
  return (
    <div className="w-[360px] h-screen bg-card border-l border-border flex flex-col shrink-0 sticky top-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
      <div className="p-6 border-b border-border flex-shrink-0">
        <h2 className="text-xl font-bold text-text mb-4">Campaign Queue</h2>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-text">{activeCampaign?.status === 'Sending' ? 'Sending...' : 'Paused'}</span>
            <span className="text-sm font-bold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-gray-100" />
        </div>

        <Tabs value={queueFilter} onValueChange={(v) => setQueueFilter(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-gray-50 h-10 p-1 rounded-lg">
            <TabsTrigger value="all" className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
            <TabsTrigger value="sent" className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Sent</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Wait</TabsTrigger>
            <TabsTrigger value="failed" className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Fail</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredItems.map((item) => (
          <div key={item.id} className="p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarFallback className="bg-white font-medium text-secondary">{(item.name || item.email || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text leading-tight">{item.name}</span>
                  <span className="text-xs text-secondary leading-tight mt-0.5">{item.email}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "text-[11px] font-bold px-2 py-0.5 rounded-full leading-tight block mb-1",
                  getStatusColor(item.status).bg,
                  getStatusColor(item.status).color
                )}>
                  {item.status}
                </span>
                <span className="text-[11px] font-medium text-secondary">{item.time}</span>
              </div>
            </div>
            {item.status === 'Failed' && (item as any).error && (
              <div className="mt-2 text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-100">
                <strong>Error:</strong> {(item as any).error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
