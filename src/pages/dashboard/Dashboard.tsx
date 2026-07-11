import { Header } from "@/components/Header/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { QueuePanel } from "@/components/queue/QueuePanel";
import { Send, MailOpen, Clock, XCircle, AlertTriangle, ArrowRight, BarChart3 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const isQueuePanelOpen = useStore(state => state.isQueuePanelOpen);
  const queueItems = useStore(state => state.queueItems);
  const settings = useStore(state => state.settings);
  const sentHistory = useStore(state => state.sentHistory);
  const campaignHistory = useStore(state => state.campaignHistory);
  const navigate = useNavigate();

  const sentCount = queueItems.filter(i => i.status === 'Sent').length + sentHistory.length;
  const pendingCount = queueItems.filter(i => i.status === 'Pending' || i.status === 'Sending').length;
  const failedCount = queueItems.filter(i => i.status === 'Failed').length;
  const totalEmails = sentCount + failedCount;
  const deliveryRate = totalEmails > 0 ? Math.round((sentCount / totalEmails) * 100) : 0;

  const profileIncomplete = !settings.globalVariables?.senderName || !settings.globalVariables?.skills;

  return (
    <div className="flex h-full w-full relative">
      {/* Main Content Area */}
      <div className="flex-1 min-w-[600px] max-w-[900px] flex flex-col relative border-r border-border overflow-hidden">
        <Header />
        <div className="flex-1 p-6 space-y-5 overflow-y-auto">

          {/* Profile Setup Banner */}
          {profileIncomplete && (
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center justify-between gap-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-3.5 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">Complete your Sender Profile</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Add your name, job title, and skills so all emails are properly personalized
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:text-amber-900 whitespace-nowrap bg-amber-100 rounded-lg px-3 py-1.5">
                Setup Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard icon={Send} title="Total Sent" value={sentCount} color="primary" />
            <StatCard icon={MailOpen} title="Delivery Rate" value={`${deliveryRate}%`} color="success" />
            <StatCard icon={Clock} title="Pending" value={pendingCount} color="warning" />
            <StatCard icon={XCircle} title="Failed" value={failedCount} color="danger" />
          </div>

          {/* Two Column Row: Campaign + Mini Analytics */}
          <div className="grid grid-cols-5 gap-4">
            {/* Campaign Card - wider */}
            <div className="col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-text uppercase tracking-wide">Active Campaign</h2>
                <button
                  onClick={() => navigate('/campaigns')}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <CampaignCard />
            </div>

            {/* Mini stats sidebar */}
            <div className="col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-text uppercase tracking-wide">Overview</h2>
                <button
                  onClick={() => navigate('/analytics')}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  Full report <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Campaigns completed */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-soft flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xl font-black text-text">{campaignHistory.length}</div>
                  <div className="text-xs text-secondary font-semibold">Campaigns completed</div>
                </div>
              </div>

              {/* Delivery rate visual */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-soft flex-1">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-secondary">Delivery Rate</span>
                  <span className="text-sm font-black text-emerald-600">{deliveryRate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${deliveryRate}%`,
                      background: 'linear-gradient(to right, #10b981, #34d399)'
                    }}
                  />
                </div>
                <p className="text-[11px] text-secondary mt-2 leading-relaxed">
                  {deliveryRate >= 90 ? '✓ Excellent delivery health' :
                   deliveryRate >= 70 ? '↑ Good, keep it up' :
                   'Add random delays to improve'}
                </p>

                {/* Sent today */}
                <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-[11px] text-secondary font-semibold">All time sent</span>
                  <span className="text-xs font-black text-text">{sentCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-black text-text uppercase tracking-wide mb-3">Quick Actions</h2>
            <QuickActions />
          </div>

        </div>
      </div>

      {/* Queue Panel (Right Sidebar) */}
      {isQueuePanelOpen && <QueuePanel />}
    </div>
  );
}
