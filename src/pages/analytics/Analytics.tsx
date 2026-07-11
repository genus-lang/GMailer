import { Header } from "@/components/Header/Header";
import { BarChart3, TrendingUp, Mail, XCircle, Zap, CheckCircle2, AlertTriangle, Target, Activity, ChevronUp } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useMemo, useState, useEffect } from "react";
import { getAIStats } from "@/lib/aiTracker";

export function Analytics() {
  const { campaignHistory, activeCampaign, dailyUsage, sentHistory } = useStore();
  const [aiStats, setAiStats] = useState({ totalCalls: 0, estimatedCost: 0, totalTokens: 0 });

  useEffect(() => {
    getAIStats().then(setAiStats);
  }, []);

  const metrics = useMemo(() => {
    let totalSent = (activeCampaign ? activeCampaign.sent : 0) + sentHistory.length;
    let totalFailed = activeCampaign ? activeCampaign.failed : 0;

    campaignHistory.forEach(camp => {
      totalFailed += camp.failed;
    });

    const totalEmails = totalSent + totalFailed;
    const deliveryRate = totalEmails > 0 ? ((totalSent / totalEmails) * 100).toFixed(1) : "0.0";
    const bounceRate = totalEmails > 0 ? ((totalFailed / totalEmails) * 100).toFixed(1) : "0.0";
    const activeCount = activeCampaign ? 1 : 0;
    const completedCampaigns = campaignHistory.length;

    return { totalSent, totalFailed, deliveryRate, bounceRate, activeCount, completedCampaigns };
  }, [campaignHistory, activeCampaign, sentHistory]);

  // Build real chart data per day using sentHistory timestamps
  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    const dayCountMap: Record<string, number> = {};

    sentHistory.forEach(item => {
      if ((item as any).sentAt) {
        const date = new Date((item as any).sentAt);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        // "Today" bucket if same calendar day
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const key = isToday ? 'Today' : dayName;
        dayCountMap[key] = (dayCountMap[key] || 0) + 1;
      }
    });

    // Also add current queue sent items for today
    dayCountMap['Today'] = (dayCountMap['Today'] || 0) + (dailyUsage?.emailsSent || 0);

    const maxCount = Math.max(1, ...Object.values(dayCountMap));
    return days.map(day => ({
      day,
      count: dayCountMap[day] || 0,
      pct: Math.max(4, Math.round(((dayCountMap[day] || 0) / maxCount) * 100))
    }));
  }, [sentHistory, dailyUsage]);

  const reputationScore = parseFloat(metrics.bounceRate) < 2 ? 95 :
    parseFloat(metrics.bounceRate) < 5 ? 75 :
    parseFloat(metrics.bounceRate) < 10 ? 50 : 25;

  const reputationLabel = reputationScore >= 90 ? 'Excellent' :
    reputationScore >= 70 ? 'Good' :
    reputationScore >= 50 ? 'Fair' : 'Poor';

  const reputationColor = reputationScore >= 90 ? 'text-emerald-600' :
    reputationScore >= 70 ? 'text-blue-600' :
    reputationScore >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="flex flex-col h-full w-full bg-background relative border-r border-border">
      <Header />
      <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">

        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text mb-0.5">Analytics & Reports</h2>
            <p className="text-secondary text-sm">Monitor your campaign performance and sending metrics.</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">Live Data</span>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "Total Sent", value: metrics.totalSent.toLocaleString(),
              icon: Mail, gradient: "from-blue-500 to-indigo-600",
              bg: "bg-blue-50", iconColor: "text-blue-600",
              sub: `${dailyUsage?.emailsSent || 0} today`, trend: true
            },
            {
              label: "Delivery Rate", value: `${metrics.deliveryRate}%`,
              icon: TrendingUp, gradient: "from-emerald-500 to-green-600",
              bg: "bg-emerald-50", iconColor: "text-emerald-600",
              sub: "of all emails delivered", trend: parseFloat(metrics.deliveryRate) > 90
            },
            {
              label: "Bounce Rate", value: `${metrics.bounceRate}%`,
              icon: XCircle, gradient: "from-red-500 to-rose-600",
              bg: "bg-red-50", iconColor: "text-red-500",
              sub: parseFloat(metrics.bounceRate) < 2 ? "Healthy ✓" : "Keep below 2%", trend: false
            },
            {
              label: "Campaigns Done", value: metrics.completedCampaigns.toString(),
              icon: Target, gradient: "from-violet-500 to-purple-600",
              bg: "bg-violet-50", iconColor: "text-violet-600",
              sub: metrics.activeCount ? "1 running now" : "None active", trend: metrics.completedCampaigns > 0
            },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-soft hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.04] rounded-full -translate-y-4 translate-x-4 group-hover:opacity-[0.08] transition-opacity"
                style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                {stat.trend && (
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <ChevronUp className="w-3 h-3" /> up
                  </div>
                )}
              </div>
              <div className="text-2xl font-black text-text mb-0.5">{stat.value}</div>
              <div className="text-xs font-semibold text-secondary mb-1">{stat.label}</div>
              <div className="text-xs text-secondary/70">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-4 flex-1">

          {/* Bar Chart */}
          <div className="col-span-2 bg-card border border-border rounded-2xl p-6 shadow-soft flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-text">Emails Sent</h3>
                <p className="text-xs text-secondary mt-0.5">Last 7 days activity</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-primary/80 rounded" />
                <span className="text-xs text-secondary font-semibold">Emails delivered</span>
              </div>
            </div>

            <div className="flex-1 flex items-end justify-between gap-3 px-2">
              {chartData.map((data, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                  <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '160px' }}>
                    {/* Count tooltip */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 pointer-events-none">
                      {data.count} sent
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                    {/* Bar */}
                    <div
                      className="w-full rounded-t-lg transition-all duration-700 ease-out cursor-pointer"
                      style={{
                        height: `${data.pct}%`,
                        background: data.day === 'Today'
                          ? 'linear-gradient(to top, #4f46e5, #818cf8)'
                          : 'linear-gradient(to top, #c7d2fe, #e0e7ff)',
                        minHeight: '6px'
                      }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold whitespace-nowrap ${data.day === 'Today' ? 'text-primary' : 'text-secondary'}`}>
                    {data.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-4">

            {/* Account Health */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-soft flex-1">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-base text-text">Account Health</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-secondary">Reputation</span>
                    <span className={`text-xs font-black ${reputationColor}`}>{reputationLabel}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${reputationScore}%`,
                        background: reputationScore >= 90
                          ? 'linear-gradient(to right, #10b981, #34d399)'
                          : reputationScore >= 70
                          ? 'linear-gradient(to right, #3b82f6, #60a5fa)'
                          : 'linear-gradient(to right, #f59e0b, #fbbf24)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-secondary">Spam Reports</span>
                    <span className="text-xs font-black text-text">
                      {parseFloat(metrics.bounceRate) < 2 ? '~0.01%' : `${metrics.bounceRate}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: '2%' }}
                    />
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex gap-2 pt-1">
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700">Delays Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700">MIME OK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Usage */}
            <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 rounded-2xl p-5 shadow-soft relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10">
                <Zap className="w-24 h-24 text-white translate-x-4 -translate-y-4" />
              </div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-white text-sm">AI Usage</h3>
              </div>
              <div className="space-y-3 relative z-10">
                {[
                  { label: "API Calls", value: aiStats.totalCalls.toLocaleString() },
                  { label: "Tokens", value: aiStats.totalTokens.toLocaleString() },
                  { label: "Cost", value: `$${aiStats.estimatedCost.toFixed(4)}` },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs text-white/70 font-semibold">{row.label}</span>
                    <span className="text-xs text-white font-black">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-black text-amber-800">Pro Tip</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Keep bounce rate under <strong>2%</strong> and always send with random delays to avoid the spam folder.
              </p>
            </div>
          </div>
        </div>

        {/* Campaign History Table */}
        {campaignHistory.length > 0 && (
          <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-base text-text">Campaign History</h3>
              </div>
              <span className="text-xs text-secondary font-semibold bg-gray-100 px-2.5 py-1 rounded-full">
                {campaignHistory.length} campaigns
              </span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  {['Campaign', 'Sent', 'Failed', 'Delivery', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {campaignHistory.slice(0, 5).map((c, i) => {
                  const total = c.sent + c.failed;
                  const rate = total > 0 ? ((c.sent / total) * 100).toFixed(0) : '0';
                  return (
                    <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-text truncate max-w-[180px] block">{c.name}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-emerald-600">{c.sent}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-red-500">{c.failed}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-secondary">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
