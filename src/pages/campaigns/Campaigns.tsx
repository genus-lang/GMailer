import { Header } from "@/components/Header/Header";
import { Button } from "@/components/ui/button";
import { Plus, Play, Pause, CheckCircle2, Square } from "lucide-react";
import { useStore } from "@/store/useStore";
import { LIMITS } from "@/config/limits";
import { useNavigate } from "react-router-dom";

export function Campaigns() {
  const { activeCampaign, pauseCampaign, resumeCampaign, campaignHistory, userPlan, setUpgradeDialogOpen } = useStore();
  const navigate = useNavigate();

  const totalCampaigns = campaignHistory.length + (activeCampaign ? 1 : 0);

  return (
    <div className="flex flex-col h-full w-full bg-background relative border-r border-border">
      <Header />
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text mb-1">Campaigns</h2>
            <p className="text-secondary text-sm">Manage your active and historical email campaigns.</p>
          </div>
          <Button 
            onClick={() => {
              if (userPlan === 'FREE' && totalCampaigns >= LIMITS.FREE.MAX_CAMPAIGNS) {
                 setUpgradeDialogOpen(true, `You've reached the free limit of ${LIMITS.FREE.MAX_CAMPAIGNS} campaigns. Upgrade to GMailer Plus (₹25/month) for unlimited campaigns.`);
              } else {
                 navigate("/campaigns/new");
              }
            }} 
            className="bg-primary hover:bg-primary-hover text-white shadow-soft"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Active Campaign Section */}
        {activeCampaign && (
          <div className="mb-8 p-6 bg-primary-light/5 border border-primary/20 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="font-bold text-lg">{activeCampaign.name}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  {activeCampaign.status}
                </span>
              </div>
              <div className="flex gap-2">
                {activeCampaign.status === 'Sending' ? (
                  <Button variant="outline" size="sm" onClick={pauseCampaign}>
                    <Pause className="w-4 h-4 mr-1" /> Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={resumeCampaign}>
                    <Play className="w-4 h-4 mr-1" /> Resume
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={useStore.getState().stopCampaign} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Square className="w-4 h-4 mr-1" /> Stop
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <p className="text-sm text-secondary mb-1">Progress</p>
                <p className="text-2xl font-bold">{Math.round((activeCampaign.sent / activeCampaign.total) * 100)}%</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <p className="text-sm text-secondary mb-1">Emails Sent</p>
                <p className="text-2xl font-bold">{activeCampaign.sent} / {activeCampaign.total}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <p className="text-sm text-secondary mb-1">Failed</p>
                <p className="text-2xl font-bold text-danger">{activeCampaign.failed}</p>
              </div>
            </div>
          </div>
        )}

        {/* Historical Campaigns */}
        <h3 className="font-bold text-lg mb-4">Past Campaigns</h3>
        <div className="bg-card border border-border rounded-2xl overflow-auto shadow-soft">
          <table className="w-full text-left whitespace-nowrap min-w-[600px]">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Campaign Name</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Sent</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Open Rate</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaignHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-secondary text-sm">No historical campaigns found.</td>
                </tr>
              ) : (
                campaignHistory.map((camp) => (
                  <tr key={camp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-semibold text-sm">{camp.name}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-success-light text-xs font-bold rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {camp.status}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-sm">{(camp.sent || 0).toLocaleString()}</td>
                    <td className="p-4 font-semibold text-sm">{camp.openRate}</td>
                    <td className="p-4 text-sm text-secondary">{camp.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
