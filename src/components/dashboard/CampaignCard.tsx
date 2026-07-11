import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Calendar, Pause, Play, ExternalLink, CheckCircle2, TrendingUp } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useNavigate } from "react-router-dom";

export function CampaignCard() {
  const { activeCampaign, toggleCampaignStatus } = useStore();
  const navigate = useNavigate();

  if (!activeCampaign) {
    return (
      <div className="bg-card rounded-2xl border border-border border-dashed p-8 flex flex-col items-center justify-center gap-4 min-h-[180px]">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-text">No Active Campaign</p>
          <p className="text-xs text-secondary mt-1">Start a new campaign to begin sending emails</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/campaigns/new')}
          className="bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-bold px-4"
        >
          + New Campaign
        </Button>
      </div>
    );
  }

  const isRunning = activeCampaign.status === 'Sending';
  const isCompleted = activeCampaign.status === 'Completed';
  const isPaused = activeCampaign.status === 'Paused';


  const progressPercent = activeCampaign.total > 0
    ? Math.round((activeCampaign.sent / activeCampaign.total) * 100)
    : 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-soft">
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isRunning ? 'bg-emerald-500 animate-pulse' :
              isCompleted ? 'bg-blue-500' : 'bg-amber-500'
            }`} />
            <span className={`text-xs font-bold ${
              isRunning ? 'text-emerald-600' :
              isCompleted ? 'text-blue-600' : 'text-amber-600'
            }`}>
              {isCompleted ? 'Completed' : activeCampaign.status}
            </span>
            <span className="text-xs text-secondary">· {progressPercent}% done</span>
          </div>
          <h3 className="text-base font-black text-text truncate">{activeCampaign.name}</h3>
        </div>
        {isCompleted && (
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 ml-3">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-secondary font-semibold">Progress</span>
          <span className="text-xs font-black text-text">{activeCampaign.sent} / {activeCampaign.total}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPercent}%`,
              background: isCompleted
                ? 'linear-gradient(to right, #3b82f6, #60a5fa)'
                : 'linear-gradient(to right, #4f46e5, #818cf8)'
            }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-border">
        {[
          { icon: Clock, label: "Next Email", value: isRunning ? activeCampaign.nextEmailIn : '—' },
          { icon: Users, label: "Recipients", value: activeCampaign.total },
          { icon: Calendar, label: "Created", value: activeCampaign.createdOn?.split(',')[0] || activeCampaign.createdOn },
        ].map(({ icon: Icon, label, value }, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-secondary" />
              <span className="text-[11px] font-semibold text-secondary">{label}</span>
            </div>
            <span className="text-sm font-black text-text leading-tight">{value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!isCompleted && (
          <Button
            variant="outline"
            onClick={toggleCampaignStatus}
            className={`flex-1 h-10 rounded-xl font-bold text-sm border-2 ${
              isRunning
                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {isRunning ? (
              <><Pause className="w-4 h-4 mr-2" /> Pause</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Resume</>
            )}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => navigate('/campaigns')}
          className="flex-1 h-10 rounded-xl border border-border text-text hover:bg-gray-50 font-bold text-sm"
        >
          View Details
          <ExternalLink className="w-3.5 h-3.5 ml-2 text-secondary" />
        </Button>
      </div>
    </div>
  );
}
