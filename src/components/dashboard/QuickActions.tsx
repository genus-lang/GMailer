import { Upload, Send, FileText, Inbox, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";

const actions = [
  { 
    label: "Import CSV", 
    desc: "Add new contacts",
    icon: Upload, 
    iconColor: "text-emerald-600", 
    bg: "from-emerald-50 to-green-50", 
    border: "border-emerald-100",
    route: "/contacts"
  },
  { 
    label: "New Campaign", 
    desc: "Send mass emails",
    icon: Send, 
    iconColor: "text-indigo-600", 
    bg: "from-indigo-50 to-blue-50", 
    border: "border-indigo-100",
    route: "/campaigns/new"
  },
  { 
    label: "Templates", 
    desc: "Manage your templates",
    icon: FileText, 
    iconColor: "text-amber-600", 
    bg: "from-amber-50 to-orange-50", 
    border: "border-amber-100",
    route: "/templates"
  },
  { 
    label: "Job Inbox", 
    desc: "View recruiter replies",
    icon: Inbox, 
    iconColor: "text-violet-600", 
    bg: "from-violet-50 to-purple-50", 
    border: "border-violet-100",
    route: "/inbox"
  },
];

export function QuickActions() {
  const { contacts } = useStore();
  const navigate = useNavigate();

  const handleAction = (action: typeof actions[0]) => {
    if (action.route === "/campaigns/new" && contacts.length === 0) {
      alert("Please import contacts first!");
      return;
    }
    navigate(action.route);
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => handleAction(action)}
          className={`bg-gradient-to-br ${action.bg} border ${action.border} rounded-2xl p-5 flex flex-col items-start gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-white/80 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <action.icon className={`w-5 h-5 ${action.iconColor}`} />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">{action.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
