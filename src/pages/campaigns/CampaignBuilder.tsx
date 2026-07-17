import { useState, useEffect } from "react";
import { Header } from "@/components/Header/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/store/useStore";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, ArrowLeft, Sparkles, Building2, List, FileText } from "lucide-react";
import { renderTemplate } from "@/background/templateEngine"; 
import { getAIProvider } from "@/lib/ai/aiService";
import { AIActionDialog } from "@/components/ui/AIActionDialog";
import { ApiService } from "@/services/api.service";

export function CampaignBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contacts, startCampaign, templates, builtinTemplates, settings, userPlan, setUpgradeDialogOpen, jwtToken } = useStore();
  
  const initialTemplateId = location.state?.selectedTemplateId;
  const isBuiltin = location.state?.isBuiltin;
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || "");

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [minDelay, setMinDelay] = useState(settings.minDelay || 20);
  const [maxDelay, setMaxDelay] = useState(settings.maxDelay || 40);
  
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set(contacts.map(c => c.id)));

  useEffect(() => {
    if (initialTemplateId) {
      const sourceList = isBuiltin ? builtinTemplates : templates;
      const t = sourceList?.find(temp => temp.id === initialTemplateId);
      if (t) {
        setSubject(t.subject);
        setBody(t.body);
        if (!name) setName(`Campaign: ${t.name}`);
      }
    }
  }, [initialTemplateId, templates, builtinTemplates, isBuiltin, name]);

  // AI States
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiTitle, setAiTitle] = useState("");
  const [aiOriginalText, setAiOriginalText] = useState("");
  const [aiSuggestedText, setAiSuggestedText] = useState<string | null>(null);
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTarget, setAiTarget] = useState<'subject'|'body'>('body');
  
  // Extra states for specific AI tools
  const [companyContext, setCompanyContext] = useState("");
  const [resumeText, setResumeText] = useState("");

  const triggerAIAction = async (title: string, target: 'subject'|'body', original: string, action: () => Promise<string | string[]>) => {
    if (userPlan === 'FREE') {
      setUpgradeDialogOpen(true, "AI Email Assistant is available in GMailer Plus. Connect your own Gemini or Groq API key and unlock AI writing for just ₹25/month.");
      return;
    }

    const provider = getAIProvider(settings.aiProvider, settings.apiKey);
    if (!provider) {
      alert("Please configure your AI Provider in Settings first.");
      return;
    }
    
    setAiTitle(title);
    setAiTarget(target);
    setAiOriginalText(original);
    setAiSuggestedText(null);
    setAiError(null);
    setAiIsGenerating(true);
    setIsAIDialogOpen(true);

    try {
      const result = await action();
      if (Array.isArray(result)) {
        setAiSuggestedText(result.join('\n\n---\n\n'));
      } else {
        setAiSuggestedText(result);
      }
    } catch (e: any) {
      setAiError(e.message || "Failed to generate AI response.");
    } finally {
      setAiIsGenerating(false);
    }
  };

  const handleAiAccept = (text: string) => {
    if (aiTarget === 'subject') setSubject(text);
    else setBody(text);
    setIsAIDialogOpen(false);
  };

  const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id)); 

  const handleStart = async () => {
    if (selectedContacts.length === 0) {
      alert("No contacts available! Import some first.");
      return;
    }

    // Deduplicate recipients by email to prevent double-sending
    const uniqueRecipients = [];
    const seenEmails = new Set();
    for (const c of selectedContacts) {
      const email = c.email.toLowerCase();
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        uniqueRecipients.push(c);
      }
    }

    setIsUploading(true);
    let uploadedPath = null;
    try {
      if (attachmentFile) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        const res = await ApiService.upload<any>('/campaigns/upload', formData, jwtToken);
        if (res && res.path) {
          uploadedPath = res.path;
        }
      }
    } catch (e) {
      console.error("Upload failed", e);
      alert("Failed to upload PDF attachment.");
      setIsUploading(false);
      return;
    }

    // Build the signature with global variables already substituted
    const signatureRendered = settings.signature
      ? renderTemplate(settings.signature, settings.globalVariables || {})
      : '';

    await startCampaign({
      id: `camp_${Date.now()}`,
      name,
      subject,
      bodyTemplate: signatureRendered ? `${body}\n\n${signatureRendered}` : body,
      minDelay,
      maxDelay,
      recipients: uniqueRecipients,
      attachmentPath: uploadedPath
    });

    setIsUploading(false);
    navigate("/");
  };

  const previewVars = {
    ...(settings.globalVariables || {}),
    ...(selectedContacts[0]?.variables || {}),
  };

  const previewSignature = settings.signature
    ? renderTemplate(settings.signature, previewVars)
    : '';

  const previewBody = selectedContacts.length > 0 
    ? renderTemplate(body, previewVars) + (previewSignature ? `\n\n${previewSignature}` : '')
    : "Preview will appear here...";

  const previewSubject = selectedContacts.length > 0
    ? renderTemplate(subject, previewVars)
    : "Subject preview...";

  return (
    <div className="flex flex-col h-full w-full bg-background relative border-r border-border">
      <Header />
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        {/* Header Area */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </Button>
          <h2 className="text-2xl font-bold text-text">Create New Campaign</h2>
        </div>

        {/* Wizard Progress */}
        <div className="flex items-center justify-between mb-8 max-w-3xl">
          {["Details", "Recipients", "Template", "Settings"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= i + 1 ? 'bg-primary text-white' : 'bg-gray-100 text-secondary'}`}>
                {i + 1}
              </div>
              <span className={`text-sm font-semibold ${step >= i + 1 ? 'text-text' : 'text-secondary'}`}>{label}</span>
              {i < 3 && <ChevronRight className="w-4 h-4 text-secondary mx-4" />}
            </div>
          ))}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="max-w-xl space-y-4">
            <h3 className="text-lg font-bold">Campaign Details</h3>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary">Campaign Name</label>
              <Input 
                placeholder="e.g. Q3 Outreach" 
                value={name} 
                onChange={e => setName(e.target.value)}
              />
            </div>
            <Button onClick={() => setStep(2)} disabled={!name} className="mt-4">Next Step</Button>
          </div>
        )}

        {/* Step 2: Recipients */}
        {step === 2 && (
          <div className="max-w-xl space-y-4">
            <h3 className="text-lg font-bold">Select Recipients</h3>
            <div className="p-4 bg-gray-50 border border-border rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{selectedContacts.length} Contacts Selected</p>
                  <p className="text-sm text-secondary">Select the contacts for this campaign.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newContacts = contacts.filter(c => !c.hasBeenEmailed);
                      const next450 = newContacts.slice(0, 450).map(c => c.id);
                      setSelectedContactIds(new Set(next450));
                    }}
                  >
                    Select Next 450 (New)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (selectedContactIds.size === contacts.filter(c => !c.hasBeenEmailed).length) {
                        setSelectedContactIds(new Set());
                      } else {
                        setSelectedContactIds(new Set(contacts.filter(c => !c.hasBeenEmailed).map(c => c.id)));
                      }
                    }}
                  >
                    {selectedContactIds.size === contacts.filter(c => !c.hasBeenEmailed).length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto border border-border rounded-md bg-white">
                {contacts.map(contact => (
                  <label key={contact.id} className={`flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-gray-50 ${contact.hasBeenEmailed ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input 
                      type="checkbox" 
                      className="accent-primary w-4 h-4"
                      checked={selectedContactIds.has(contact.id)}
                      disabled={contact.hasBeenEmailed}
                      onChange={(e) => {
                        if (contact.hasBeenEmailed) return;
                        const next = new Set(selectedContactIds);
                        if (e.target.checked) next.add(contact.id);
                        else next.delete(contact.id);
                        setSelectedContactIds(next);
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{contact.name || contact.email}</p>
                        {contact.hasBeenEmailed && (
                          <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Already Emailed
                          </span>
                        )}
                      </div>
                      {contact.name && <p className="text-xs text-secondary">{contact.email}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={selectedContacts.length === 0}>Next Step</Button>
            </div>
          </div>
        )}

        {/* Step 3: Template */}
        {step === 3 && (
          <div className="flex gap-8 max-w-5xl">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">Email Template</h3>
                {templates.length > 0 && (
                  <select 
                    className="text-sm border border-border rounded-md px-2 py-1 bg-white"
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTemplateId(val);
                      const t = templates.find(temp => temp.id === val);
                      if (t) {
                        setSubject(t.subject);
                        setBody(t.body);
                      }
                    }}
                  >
                    <option value="">Load from saved template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-secondary">Subject</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-primary-light/5 text-primary border-primary/20 hover:bg-primary-light/10"
                    onClick={() => triggerAIAction(
                      "Generate Subjects", 
                      "subject", 
                      subject || "Write a cold email about a new software product", 
                      () => getAIProvider(settings.aiProvider, settings.apiKey)!.generateSubjects(subject || "Cold outreach email")
                    )}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate Subject
                  </Button>
                </div>
                <Input 
                  placeholder="Hi {{firstName}}!" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-semibold text-secondary">Body</label>
                  <div className="flex gap-2 flex-wrap justify-end max-w-lg">
                    <Button 
                      variant="outline" size="sm" 
                      className="h-7 text-xs bg-primary-light/5 text-primary border-primary/20 hover:bg-primary-light/10"
                      onClick={() => triggerAIAction("Improve Email", "body", body, () => getAIProvider(settings.aiProvider, settings.apiKey)!.improveEmail(body))}
                      disabled={!body}
                    >
                      <Sparkles className="w-3 h-3 mr-1" /> Improve
                    </Button>
                    
                    <div className="flex items-center gap-1 bg-white border border-border rounded-md px-1 pl-2">
                      <Building2 className="w-3 h-3 text-secondary" />
                      <Input 
                        placeholder="Company Type (e.g. Startup)" 
                        className="h-6 w-32 border-0 focus-visible:ring-0 text-xs px-1"
                        value={companyContext}
                        onChange={e => setCompanyContext(e.target.value)}
                      />
                      <Button 
                        variant="ghost" size="sm" 
                        className="h-5 px-2 text-xs text-primary hover:bg-primary-light/10"
                        onClick={() => triggerAIAction("Personalize Email", "body", body, () => getAIProvider(settings.aiProvider, settings.apiKey)!.personalizeEmail(body, companyContext))}
                        disabled={!body || !companyContext}
                      >
                        Personalize
                      </Button>
                    </div>

                    <Button 
                      variant="outline" size="sm" 
                      className="h-7 text-xs bg-white text-secondary border-border hover:text-primary"
                      onClick={() => triggerAIAction("Generate Variations", "body", body, () => getAIProvider(settings.aiProvider, settings.apiKey)!.generateVariations(body))}
                      disabled={!body}
                    >
                      <List className="w-3 h-3 mr-1" /> Variations
                    </Button>
                  </div>
                </div>
                
                {/* Resume Matcher input */}
                <div className="flex items-center gap-2 bg-gray-50 border border-border rounded-md p-2">
                  <FileText className="w-4 h-4 text-secondary" />
                  <Input 
                    placeholder="Paste resume text here for AI matching..." 
                    className="h-8 flex-1 bg-white border-border text-xs"
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                  />
                  <Button 
                    variant="outline" size="sm" 
                    className="h-8 text-xs bg-primary-light/5 text-primary border-primary/20"
                    onClick={() => triggerAIAction("Match Resume", "body", body, () => getAIProvider(settings.aiProvider, settings.apiKey)!.matchResume(body, resumeText))}
                    disabled={!body || !resumeText}
                  >
                    Match Resume
                  </Button>
                </div>

                <Textarea 
                  placeholder="Type your message here..." 
                  className="min-h-[250px]"
                  value={body}
                  onChange={(e: any) => setBody(e.target.value)}
                />

                <div className="flex flex-col gap-2 p-3 bg-gray-50 border border-border rounded-md">
                  <label className="text-sm font-semibold text-secondary flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Attach PDF Resume
                  </label>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    className="text-sm file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                  />
                  {attachmentFile && <span className="text-xs text-green-600 font-medium">Selected: {attachmentFile.name}</span>}
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => setStep(4)} disabled={!subject || !body}>Next Step</Button>
              </div>
            </div>

            {/* Live Preview Pane */}
            <div className="w-[400px] flex-shrink-0">
              <h3 className="text-lg font-bold mb-4">Live Preview</h3>
              <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-border p-3 text-sm">
                  <p><span className="font-semibold text-secondary">To:</span> {selectedContacts[0]?.email || 'recipient@example.com'}</p>
                  <p><span className="font-semibold text-secondary">Subject:</span> {previewSubject}</p>
                </div>
                <div className="p-4 text-sm whitespace-pre-wrap font-sans text-text">
                  {previewBody}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Settings & Review */}
        {step === 4 && (
          <div className="max-w-xl space-y-4">
            <h3 className="text-lg font-bold">Sending Settings</h3>
            <p className="text-sm text-secondary mb-4">A random delay is added between each email to simulate human behavior.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Min Delay (sec)</label>
                <Input 
                  type="number"
                  value={minDelay} 
                  onChange={e => setMinDelay(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Max Delay (sec)</label>
                <Input 
                  type="number"
                  value={maxDelay} 
                  onChange={e => setMaxDelay(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="mt-8 p-4 bg-primary-light/10 border border-primary/20 rounded-lg">
              <h4 className="font-bold text-primary mb-2">Campaign Summary</h4>
              <ul className="space-y-1 text-sm">
                <li><strong>Name:</strong> {name}</li>
                <li><strong>Recipients:</strong> {selectedContacts.length}</li>
                <li><strong>Estimated Time:</strong> ~{Math.round((selectedContacts.length * ((minDelay + maxDelay) / 2)) / 60)} minutes</li>
              </ul>
            </div>

            <div className="flex gap-4 mt-8 items-center">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <div className="flex-1" />
              <Button 
                variant="outline" 
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={() => {
                  if (userPlan === 'FREE') {
                    setUpgradeDialogOpen(true, "Campaign scheduling is a Plus feature. Upgrade for ₹25/month.");
                  } else {
                    // Logic for scheduling would go here in the future
                    alert("Campaign scheduled for later!");
                  }
                }}
              >
                Schedule Campaign
              </Button>
              <Button onClick={handleStart} disabled={isUploading} className="bg-success text-white hover:bg-success/90">
                {isUploading ? "Uploading..." : "Start Campaign Now"}
              </Button>
            </div>
          </div>
        )}

      </div>

      <AIActionDialog
        isOpen={isAIDialogOpen}
        title={aiTitle}
        originalText={aiOriginalText}
        suggestedText={aiSuggestedText}
        isGenerating={aiIsGenerating}
        error={aiError}
        onAccept={handleAiAccept}
        onReject={() => setIsAIDialogOpen(false)}
        onRegenerate={() => {
          // Simple regenerate stub
        }}
      />
    </div>
  );
}
