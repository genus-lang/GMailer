import { Header } from "@/components/Header/Header";
import { Button } from "@/components/ui/button";
import { Plus, FileText, MoreVertical, Trash, Edit2, History, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore, Template, TemplateVersion } from "@/store/useStore";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAIProvider } from "@/lib/ai/aiService";
import { AIActionDialog } from "@/components/ui/AIActionDialog";
import { Sparkles, CheckCircle2, Crown } from "lucide-react";
import { hasFeature, Features } from "@/shared/features";
import { LIMITS } from "@/config/limits";

export function Templates() {
  const navigate = useNavigate();
  const { templates, builtinTemplates, saveTemplate, deleteTemplate, settings, userPlan, setUpgradeDialogOpen } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState({ name: '', subject: '', body: '' });

  // AI States
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiTitle, setAiTitle] = useState("");
  const [aiOriginalText, setAiOriginalText] = useState("");
  const [aiSuggestedText, setAiSuggestedText] = useState<string | null>(null);
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAIImprove = async () => {
    if (userPlan === 'FREE') {
      setUpgradeDialogOpen(true, "AI Email Assistant is available in GMailer Plus. Connect your own Gemini or Groq API key and unlock AI writing for just ₹25/month.");
      return;
    }

    if (!formData.body) return;
    const provider = getAIProvider(settings.aiProvider, settings.apiKey);
    if (!provider) {
      alert("Please configure your AI Provider in Settings first.");
      return;
    }
    
    setAiTitle("Improve with AI");
    setAiOriginalText(formData.body);
    setAiSuggestedText(null);
    setAiError(null);
    setAiIsGenerating(true);
    setIsAIDialogOpen(true);

    try {
      const suggestion = await provider.improveEmail(formData.body);
      setAiSuggestedText(suggestion);
    } catch (e: any) {
      setAiError(e.message || "Failed to generate suggestion.");
    } finally {
      setAiIsGenerating(false);
    }
  };

  const handleAiAccept = (text: string) => {
    setFormData({ ...formData, body: text });
    setIsAIDialogOpen(false);
  };

  const openNew = () => {
    if (userPlan === 'FREE' && templates.length >= LIMITS.FREE.MAX_CUSTOM_TEMPLATES) {
       setUpgradeDialogOpen(true, `You've reached the free limit of ${LIMITS.FREE.MAX_CUSTOM_TEMPLATES} custom templates. Upgrade to GMailer Plus (₹25/month) for unlimited templates.`);
       return;
    }
    setEditingTemplate(null);
    setShowHistory(false);
    setFormData({ name: '', subject: '', body: '' });
    setIsModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setShowHistory(false);
    setFormData({ name: t.name, subject: t.subject, body: t.body });
    setIsModalOpen(true);
  };

  const handleRestoreVersion = (v: TemplateVersion) => {
    if (confirm("This will overwrite your current draft. Continue?")) {
      setFormData({ ...formData, subject: v.subject, body: v.body });
      setShowHistory(false);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.body) return;
    saveTemplate({
      id: editingTemplate ? editingTemplate.id : Date.now().toString(),
      ...formData
    });
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative border-r border-border">
      <Header />
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text mb-1">Templates</h2>
            <p className="text-secondary text-sm">Create and manage your reusable email templates.</p>
          </div>
          <Button onClick={openNew} className="bg-primary hover:bg-primary-hover text-white shadow-soft">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        {templates.length === 0 && (!builtinTemplates || builtinTemplates.length === 0) ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <FileText className="w-12 h-12 text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-text mb-2">No Templates Yet</h3>
            <p className="text-secondary text-sm max-w-md mb-6">
              Create your first email template to save time when launching new campaigns.
            </p>
            <Button onClick={openNew} className="bg-primary text-white shadow-soft">
              Create Template
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* My Custom Templates */}
            {templates.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-text mb-4">My Custom Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <div key={template.id} className="bg-card border border-border rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow group flex flex-col relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-warning flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(template)} className="p-1.5 text-secondary hover:text-primary transition-colors bg-gray-50 rounded-md">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteTemplate(template.id)} className="p-1.5 text-secondary hover:text-danger transition-colors bg-gray-50 rounded-md">
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">{template.name}</h3>
                      <p className="text-xs font-semibold text-secondary mb-4 line-clamp-1">
                        Subj: {Object.entries(settings.globalVariables || {}).reduce((acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, 'g'), v || `{{${k}}}`), template.subject)}
                      </p>
                      
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-secondary line-clamp-[8] font-mono text-xs flex-1 whitespace-pre-wrap">
                        {Object.entries(settings.globalVariables || {}).reduce((acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, 'g'), v || `{{${k}}}`), template.body)}
                      </div>
                      
                      <div className="mt-6">
                        <Button onClick={() => navigate("/campaigns/new", { state: { selectedTemplateId: template.id } })} className="w-full text-xs h-8 bg-primary/10 text-primary hover:bg-primary/20 border-0">
                          Use in Campaign
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Built-in Templates by Category */}
            {builtinTemplates && builtinTemplates.length > 0 && Array.from(new Set(builtinTemplates.map((t: any) => t.category))).map(category => (
              <div key={category as string}>
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  {category === 'Featured' && <Sparkles className="w-5 h-5 text-amber-500" />}
                  {category as string}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {builtinTemplates.filter((t: any) => t.category === category).map((template: any) => (
                    <div key={template.id} className="bg-card border border-border rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow group flex flex-col relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <Button 
                          onClick={() => {
                            saveTemplate({ id: Date.now().toString(), name: template.name + ' (Copy)', subject: template.subject, body: template.body });
                          }} 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Duplicate
                        </Button>
                      </div>
                      <h3 className="font-bold text-lg mb-1 line-clamp-1 flex items-center gap-2">
                        {template.name}
                        {template.name.includes('Premium') && <Crown className="w-4 h-4 text-pink-500" />}
                      </h3>
                      <p className="text-xs font-semibold text-secondary mb-4 line-clamp-1">
                        Subj: {template.subject}
                      </p>
                      
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-secondary line-clamp-[8] font-mono text-xs flex-1 whitespace-pre-wrap">
                        {template.body}
                      </div>
                      
                      <div className="mt-6">
                        <Button 
                          onClick={() => navigate("/campaigns/new", { state: { selectedTemplateId: template.id, isBuiltin: true } })} 
                          className="w-full text-xs h-8 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-0"
                        >
                          Use in Campaign
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {userPlan === 'FREE' && builtinTemplates && builtinTemplates.length === 3 && (
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between mt-8">
                <div>
                  <h4 className="font-bold text-lg flex items-center gap-2"><Crown className="w-5 h-5 text-pink-500" /> Unlock 8+ Premium Templates</h4>
                  <p className="text-sm text-secondary mt-1">Upgrade to PRO or MAX to access Recruiters, Startups, Developers, and AI Smart Personalized templates.</p>
                </div>
                <Button onClick={() => setUpgradeDialogOpen(true)} className="mt-4 sm:mt-0 bg-purple-600 hover:bg-purple-700 text-white shadow-soft">
                  Upgrade Now
                </Button>
              </div>
            )}
          </div>
        )}

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">{editingTemplate ? 'Edit Template' : 'New Template'}</h2>
                {editingTemplate && editingTemplate.versions && editingTemplate.versions.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={`h-7 text-xs ${showHistory ? 'bg-primary-light/10 text-primary border-primary/20' : ''}`}
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History className="w-3 h-3 mr-1" />
                    History ({editingTemplate.versions.length})
                  </Button>
                )}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-text"><Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              <div className={`p-6 overflow-y-auto flex-1 space-y-4 ${showHistory ? 'border-r border-border' : ''}`}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Template Name</label>
                <Input 
                  placeholder="e.g. Initial Outreach (Founders)" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Email Subject</label>
                <Input 
                  placeholder="Quick question about {{company}}" 
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                />
                <p className="text-[11px] text-secondary">Use {"{{variable}}"} for dynamic insertion.</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-secondary">Email Body</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/20 group"
                    onClick={handleAIImprove}
                    disabled={!formData.body && hasFeature(userPlan as any, Features.AI_EMAIL)}
                  >
                    {!hasFeature(userPlan as any, Features.AI_EMAIL) && <Crown className="w-3 h-3 mr-1 text-amber-500" />}
                    <Sparkles className="w-3 h-3 mr-1" />
                    Improve with AI
                  </Button>
                </div>
                <Textarea 
                  className="min-h-[250px] font-mono text-sm"
                  placeholder="Hi {{firstName}},\n\nI noticed..."
                  value={formData.body}
                  onChange={e => setFormData({ ...formData, body: e.target.value })}
                />
              </div>
            </div>

            {showHistory && editingTemplate && editingTemplate.versions && (
              <div className="w-64 bg-gray-50 overflow-y-auto p-4 border-l border-border">
                <h4 className="text-sm font-bold text-text mb-4">Version History</h4>
                <div className="space-y-3">
                  {editingTemplate.versions.map(v => (
                    <div key={v.versionId} className="bg-white border border-border rounded-lg p-3 shadow-sm group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-secondary">
                          {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <button 
                          onClick={() => handleRestoreVersion(v)}
                          className="opacity-0 group-hover:opacity-100 text-primary hover:bg-primary-light/10 p-1 rounded transition-all"
                          title="Restore this version"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-secondary line-clamp-1 mb-1">Subj: {v.subject}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-2 italic">{v.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>

            <div className="p-6 border-t border-border bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-primary text-white hover:bg-primary-hover">Save Template</Button>
            </div>
          </div>
        </div>
      )}

      <AIActionDialog
        isOpen={isAIDialogOpen}
        title={aiTitle}
        originalText={aiOriginalText}
        suggestedText={aiSuggestedText}
        isGenerating={aiIsGenerating}
        error={aiError}
        onAccept={handleAiAccept}
        onReject={() => setIsAIDialogOpen(false)}
        onRegenerate={handleAIImprove}
      />
    </div>
  );
}
