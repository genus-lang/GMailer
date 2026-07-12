import { Settings, X, CheckCircle, PanelRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { isConnected, userEmail, connectGoogle, isQueuePanelOpen, setQueuePanelOpen, userPlan } = useStore();
  const navigate = useNavigate();

  return (
    <header className="h-16 flex items-center justify-between px-8 py-4 sticky top-0 bg-background z-10">
      <div className="flex items-center gap-2">
        <h1 className="text-[22px] font-bold text-text">Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {userPlan === 'PRO' && (
            <Badge className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold border-none shadow-sm h-7 px-3">
              GMailer Plus ✨
            </Badge>
          )}
          {userPlan === 'MAX' && (
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black border-none shadow-sm h-7 px-3">
              GMailer Max 🚀
            </Badge>
          )}
          <Badge variant="outline" className={`font-semibold ${isConnected ? 'bg-green-50 text-success-light border-green-200' : 'bg-red-50 text-danger border-red-200'}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-success-light' : 'bg-danger'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <span className="text-sm font-medium text-text bg-gray-50 px-3 py-1 rounded-lg border border-border">
            {isConnected ? (userEmail || 'Loading Profile...') : 'Not Connected'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {!isConnected && (
          <Button onClick={() => connectGoogle()} className="bg-primary hover:bg-primary-hover text-white shadow-soft rounded-lg h-9 px-4 font-semibold">
            Connect Google
          </Button>
        )}
        <button 
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors border border-transparent hover:border-border"
        >
          <Settings className="w-5 h-5 text-secondary" />
        </button>
        
        {/* Close Icon (Extension) */}
        <button 
          onClick={() => setQueuePanelOpen(!isQueuePanelOpen)}
          className="w-8 h-8 flex items-center justify-center text-secondary hover:text-text transition-colors rounded-lg hover:bg-gray-100"
          title="Toggle Queue Panel"
        >
          {isQueuePanelOpen ? <X className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
