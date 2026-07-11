import { Header } from "@/components/Header/Header";
import { useStore } from "@/store/useStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, Search, Mail, Clock, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export function Sent() {
  const { sentHistory, queueItems } = useStore();
  const [search, setSearch] = useState("");

  // Combine permanent sentHistory + any currently-sent items in the active queue
  const activeSentItems = queueItems.filter(i => i.status === 'Sent');

  const allSentItems = useMemo(() => {
    // Merge active queue sent items with permanent history, deduplicate by id
    const combined = [...activeSentItems, ...sentHistory];
    const seen = new Set<string | number>();
    return combined.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [sentHistory, queueItems]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allSentItems;
    const q = search.toLowerCase();
    return allSentItems.filter(item =>
      item.email?.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q) ||
      (item as any).subject?.toLowerCase().includes(q) ||
      (item as any).campaignName?.toLowerCase().includes(q)
    );
  }, [allSentItems, search]);

  const groupedByCampaign = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(item => {
      const key = (item as any).campaignName || 'Unknown Campaign';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full w-full bg-background relative border-r border-border">
      <Header />
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text mb-1">Sent History</h2>
            <p className="text-secondary text-sm">
              All emails successfully delivered — <span className="font-bold text-primary">{allSentItems.length} total</span>
            </p>
          </div>
          
          <div className="w-72 relative">
            <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              className="pl-9"
              placeholder="Search by name, email, subject..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {allSentItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-lg font-bold text-text mb-2">No emails sent yet</h3>
            <p className="text-secondary text-sm max-w-xs">
              Once you run a campaign, all sent emails will appear here — permanently, even after the campaign completes.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-24">
            <p className="text-secondary text-sm">No emails match your search.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByCampaign).map(([campaignName, items]) => (
              <div key={campaignName} className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
                {/* Campaign Header */}
                <div className="bg-gray-50 border-b border-border px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-text">{campaignName}</span>
                  </div>
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
                    {items.length} sent
                  </span>
                </div>
                
                <table className="w-full text-left">
                  <thead className="bg-white border-b border-border/60">
                    <tr>
                      <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider">Recipient</th>
                      <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider">Subject</th>
                      <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                              <AvatarFallback className="bg-primary-light/10 font-bold text-primary text-xs">
                                {(item.name || item.email || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-text leading-tight truncate">{item.name || "Unknown"}</span>
                              <span className="text-xs text-secondary leading-tight mt-0.5 truncate">{item.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-[200px]">
                          <span className="text-xs text-secondary truncate block">
                            {(item as any).subject || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Delivered
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-secondary font-semibold">
                            <Clock className="w-3 h-3" />
                            {(item as any).sentAt 
                              ? new Date((item as any).sentAt).toLocaleString('en-IN', { 
                                  month: 'short', day: 'numeric', 
                                  hour: '2-digit', minute: '2-digit' 
                                })
                              : item.time || '—'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
