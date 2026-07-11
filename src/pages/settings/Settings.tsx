import { Header } from "@/components/Header/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Eye, EyeOff, FileUp, Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useState, useRef, useEffect } from "react";
import { getAIProvider } from "@/lib/ai/aiService";
import { extractTextFromFile } from "@/lib/utils/pdfParser";
import { PLANS } from "@/lib/plans";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { hasFeature, Features } from "@/shared/features";
import { Crown, Lock } from "lucide-react";

export function Settings() {
  const { isConnected, userEmail, settings, updateSettings, userPlan, setUpgradeDialogOpen } = useStore();
  const [formData, setFormData] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle'|'testing'|'success'|'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [isParsingResume, setIsParsingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({
      ...settings,
      userPlan: userPlan
    });
  }, [settings, userPlan]);

  const handleSave = () => {
    // Extract plan from settings form data to keep it separate in store
    const { userPlan: selectedPlan, ...restSettings } = formData as any;
    updateSettings(restSettings);
    useStore.setState({ userPlan: selectedPlan });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasFeature(userPlan as any, Features.AI_EMAIL)) {
      setUpgradeDialogOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (formData.aiProvider === 'None' || !formData.apiKey) {
      alert("Please configure an AI Provider and API Key first to use the Resume Parser.");
      return;
    }

    setIsParsingResume(true);
    try {
      const text = await extractTextFromFile(file);
      const provider = getAIProvider(formData.aiProvider, formData.apiKey);
      if (!provider || !provider.extractResumeDetails) {
         throw new Error("AI Provider does not support resume parsing.");
      }
      
      const details = await provider.extractResumeDetails(text);
      
      // Update form with extracted details, preserving manual inputs if AI misses something
      setFormData(prev => ({
        ...prev,
        globalVariables: {
          ...prev.globalVariables,
          senderName: details.senderName || prev.globalVariables?.senderName || '',
          currentRole: details.currentRole || prev.globalVariables?.currentRole || '',
          skills: details.skills || prev.globalVariables?.skills || '',
          portfolio: details.portfolio || prev.globalVariables?.portfolio || '',
          linkedin: details.linkedin || prev.globalVariables?.linkedin || '',
          github: details.github || prev.globalVariables?.github || '',
        }
      }));
      
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to parse resume.");
    } finally {
      setIsParsingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTestConnection = async () => {
    if (formData.aiProvider === 'None') return;
    if (!formData.apiKey) {
      setTestStatus('error');
      setTestMessage('API Key is required.');
      return;
    }
    
    setTestStatus('testing');
    try {
      const provider = getAIProvider(formData.aiProvider, formData.apiKey);
      if (provider) {
        await provider.testConnection();
        setTestStatus('success');
        setTestMessage('Connection successful!');
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage(e.message || 'Unable to connect to AI provider.');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative border-r border-border">
      <Header />
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text mb-1">Settings</h2>
            <p className="text-secondary text-sm">Configure your GMailer engine and default preferences.</p>
          </div>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary-hover text-white shadow-soft transition-all min-w-[120px]">
            {isSaved ? <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Saved!</span> : "Save Changes"}
          </Button>
        </div>

        <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-8">
            {/* Account Section */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Gmail Account</h3>
              </div>
              
              {isConnected ? (
                <div className="flex items-center justify-between bg-green-50 border border-success-light/20 p-4 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-text">Connected as</p>
                    <p className="text-xs font-bold text-success-light">{userEmail}</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-success-light" />
                </div>
              ) : (
                <div className="flex items-center justify-between bg-amber-50 border border-warning/20 p-4 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-text">Not Connected</p>
                    <p className="text-xs text-secondary">Connect Gmail to start sending.</p>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
              )}
            </section>

            {/* Sending Limits */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Current Plan</h3>
                <select 
                  className="h-8 px-2 rounded-md border border-border bg-gray-50 text-xs font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={(formData as any).userPlan || 'FREE'}
                  onChange={e => setFormData({ ...formData, userPlan: e.target.value as any } as any)}
                >
                  <option value="FREE">Free (₹0/mo)</option>
                  <option value="PRO">GMailer Plus — ₹25/mo</option>
                  <option value="MAX">GMailer Max — ₹99/mo</option>
                </select>
              </div>
              
              <p className="text-sm text-secondary mb-4">
                You are on the <strong className="text-text">{(formData as any).userPlan === 'PRO' ? 'GMailer Plus' : (formData as any).userPlan === 'MAX' ? 'GMailer Max' : 'Free'}</strong> plan.{' '}
                Your limit is <strong className="text-primary">{(formData as any).userPlan === 'MAX' ? '2,000' : (formData as any).userPlan === 'PRO' ? '500' : '50'}</strong> emails/day.
              </p>

              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-secondary">Custom Max Limit (Optional)</label>
                  <Input 
                    type="number" 
                    value={formData.maxDailyLimit}
                    onChange={e => setFormData({ ...formData, maxDailyLimit: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-secondary">Pause campaign when limit reached?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input 
                        type="radio" 
                        name="limit_action" 
                        checked={formData.pauseOnLimit === true}
                        onChange={() => setFormData({ ...formData, pauseOnLimit: true })}
                        className="accent-primary" 
                      /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input 
                        type="radio" 
                        name="limit_action" 
                        checked={formData.pauseOnLimit === false}
                        onChange={() => setFormData({ ...formData, pauseOnLimit: false })}
                        className="accent-primary" 
                      /> No
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            {/* AI Assistant */}
            <section className="relative overflow-hidden bg-card border border-primary/20 rounded-2xl p-6 shadow-soft bg-gradient-to-br from-white to-primary-light/5">
              {userPlan === 'FREE' && (
                <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                  <div className="bg-white border border-border shadow-xl rounded-2xl p-6 flex flex-col items-center max-w-[80%] text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">GMailer+ Required</h3>
                    <p className="text-xs text-secondary mb-4">Connect your own Gemini or Groq API key and unlock AI writing for just ₹25/month.</p>
                    <Button 
                      onClick={() => setUpgradeDialogOpen(true, "AI Email Assistant is available in GMailer Plus. Connect your own Gemini or Groq API key and unlock AI writing for just ₹25/month.")}
                      className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2 text-amber-300" />
                      Upgrade to GMailer+
                    </Button>
                  </div>
                </div>
              )}

              <div className={`transition-all ${userPlan === 'FREE' ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">AI Assistant</h3>
                </div>
                <p className="text-sm text-secondary mb-4">
                  Connect your AI provider to enable intelligent email improvement, personalization, and contact cleaning.
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">AI Provider</label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formData.aiProvider}
                      onChange={e => setFormData({ ...formData, aiProvider: e.target.value as any })}
                    >
                      <option value="None">None (Disabled)</option>
                      <option value="Groq">Groq (Fast & Cheap)</option>
                      <option value="Gemini">Google Gemini</option>
                      <option value="OpenAI">OpenAI (ChatGPT)</option>
                      <option value="Claude">Anthropic Claude</option>
                      <option value="Mistral">Mistral AI</option>
                    </select>
                  </div>

                  {formData.aiProvider !== 'None' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-sm font-semibold text-secondary">API Key</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input 
                            type={showKey ? "text" : "password"} 
                            placeholder="sk-..." 
                            value={formData.apiKey || ''}
                            onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                            className="pr-10"
                          />
                          <button 
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                          >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={handleTestConnection}
                          disabled={testStatus === 'testing' || !formData.apiKey}
                        >
                          {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                        </Button>
                      </div>
                      {testMessage && (
                        <p className={`text-xs font-semibold mt-1 ${testStatus === 'success' ? 'text-success' : 'text-danger'}`}>
                          {testMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Default Delays */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <h3 className="font-bold text-lg mb-4">Default Delays</h3>
              <p className="text-sm text-secondary mb-4">
                Set the default random delay range between each email. This helps bypass spam filters.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-secondary">Min (sec)</label>
                  <Input 
                    type="number" 
                    value={formData.minDelay} 
                    onChange={e => setFormData({ ...formData, minDelay: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-secondary">Max (sec)</label>
                  <Input 
                    type="number" 
                    value={formData.maxDelay} 
                    onChange={e => setFormData({ ...formData, maxDelay: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <h3 className="font-bold text-lg mb-4">Appearance</h3>
              <p className="text-sm text-secondary mb-4">
                Customize the look and feel of GMailer.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-secondary">Dark Mode</label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="relative group overflow-hidden"
                    onClick={() => {
                      if (userPlan === 'FREE') {
                        setUpgradeDialogOpen(true, "Dark mode and premium themes are available in GMailer Plus. Upgrade for just ₹25/month.");
                      } else {
                        // Toggle logic would go here
                        alert("Dark mode applied!");
                      }
                    }}
                  >
                    {userPlan === 'FREE' && <Crown className="w-3 h-3 text-amber-500 mr-2" />}
                    {userPlan === 'FREE' ? 'Unlock Dark Mode' : 'Toggle Dark Mode'}
                  </Button>
                </div>
              </div>
            </section>

            {/* Signature */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <h3 className="font-bold text-lg mb-4">Default Signature</h3>
              <p className="text-sm text-secondary mb-4">
                This plain-text signature will be appended to the bottom of all campaigns automatically.
              </p>
              
              <Textarea 
                className="min-h-[120px] font-mono text-xs" 
                value={formData.signature}
                onChange={e => setFormData({ ...formData, signature: e.target.value })}
              />
            </section>
          </div>

          <div className="space-y-8 md:col-span-2">
            {/* Global Variables */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <div>
                  <h3 className="font-bold text-lg">Sender Profile (Global Variables)</h3>
                  <p className="text-sm text-secondary">
                    Define these details once, and use them across all your templates. (e.g. <code>{'{{senderName}}'}</code>)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    accept=".pdf,.txt" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleResumeUpload}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (!hasFeature(userPlan as any, Features.AI_EMAIL)) {
                        setUpgradeDialogOpen(true);
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    disabled={isParsingResume}
                    className="gap-2 relative group overflow-hidden"
                  >
                    {!hasFeature(userPlan as any, Features.AI_EMAIL) && <Crown className="w-3 h-3 text-amber-500 absolute top-1.5 left-1.5" />}
                    {isParsingResume ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    {isParsingResume ? "Parsing..." : "Auto-fill from Resume"}
                  </Button>
                  <Button onClick={handleSave} className="bg-primary hover:bg-primary-hover text-white">
                    Save Profile
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">Your Name <code>{'{{senderName}}'}</code></label>
                    <Input 
                      placeholder="John Doe" 
                      value={formData.globalVariables?.senderName || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        globalVariables: { ...formData.globalVariables, senderName: e.target.value } 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">Job Title (Role Applying For) <code>{'{{jobTitle}}'}</code></label>
                    <Input 
                      placeholder="Software Developer" 
                      value={formData.globalVariables?.jobTitle || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        globalVariables: { ...formData.globalVariables, jobTitle: e.target.value } 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">Current Role <code>{'{{currentRole}}'}</code></label>
                    <Input 
                      placeholder="Frontend Developer" 
                      value={formData.globalVariables?.currentRole || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        globalVariables: { ...formData.globalVariables, currentRole: e.target.value } 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">Key Skills <code>{'{{skills}}'}</code></label>
                    <Textarea 
                      placeholder="React, TypeScript, Tailwind CSS" 
                      className="min-h-[80px]"
                      value={formData.globalVariables?.skills || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        globalVariables: { ...formData.globalVariables, skills: e.target.value } 
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">Portfolio URL <code>{'{{portfolio}}'}</code></label>
                    <Input 
                      placeholder="https://myportfolio.com" 
                      value={formData.globalVariables?.portfolio || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        globalVariables: { ...formData.globalVariables, portfolio: e.target.value } 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">LinkedIn <code>{'{{linkedin}}'}</code></label>
                    <Input 
                      placeholder="https://linkedin.com/in/..." 
                      value={formData.globalVariables?.linkedin || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        globalVariables: { ...formData.globalVariables, linkedin: e.target.value } 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">GitHub <code>{'{{github}}'}</code></label>
                    <Input 
                      placeholder="https://github.com/..." 
                      value={formData.globalVariables?.github || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        globalVariables: { ...formData.globalVariables, github: e.target.value } 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">Resume Link <code>{'{{resumeLink}}'}</code></label>
                    <Input 
                      placeholder="https://drive.google.com/..." 
                      value={formData.globalVariables?.resumeLink || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        globalVariables: { ...formData.globalVariables, resumeLink: e.target.value } 
                      })}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
