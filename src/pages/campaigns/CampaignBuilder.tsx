import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/Header/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/store/useStore";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, ArrowLeft, Sparkles, Building2, List, FileText, Clock, Calendar, Rocket } from "lucide-react";
import { renderTemplate } from "@/background/templateEngine"; 
import { getAIProvider } from "@/lib/ai/aiService";
import { AIActionDialog } from "@/components/ui/AIActionDialog";
import { ApiService } from "@/services/api.service";
import { cn } from "@/lib/utils";

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
  const [minDelay, setMinDelay] = useState(settings.minDelay || 15);
  const [maxDelay, setMaxDelay] = useState(settings.maxDelay || 30);
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [allowResend, setAllowResend] = useState(false);

  const [selectedContactIds, setSelectedContactIds] = useState<Set<any>>(() => {
    const unemailed = contacts.filter(c => !c.hasBeenEmailed);
    return new Set((unemailed.length > 0 ? unemailed.slice(0, 450) : contacts.slice(0, 450)).map(c => c.id));
  });

  const [recipientFilter, setRecipientFilter] = useState<'all' | 'recruiters' | 'my' | 'new'>('new');
  const [recipientSearch, setRecipientSearch] = useState('');

  const displayedContacts = useMemo(() => {
    let result = contacts;
    if (recipientFilter === 'recruiters') {
      result = result.filter(c => c.isProtected);
    } else if (recipientFilter === 'my') {
      result = result.filter(c => !c.isProtected);
    } else if (recipientFilter === 'new') {
      result = result.filter(c => !c.hasBeenEmailed);
    }

    if (recipientSearch) {
      const q = recipientSearch.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q) ||
        (c.variables?.company && c.variables.company.toLowerCase().includes(q)) ||
        (c.variables?.role && c.variables.role.toLowerCase().includes(q))
      );
    }
    return result;
  }, [contacts, recipientFilter, recipientSearch]);

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

  const handleStart = async (isScheduled: boolean = false) => {
    if (selectedContacts.length === 0) {
      alert("No contacts available! Import or select some first.");
      return;
    }

    if (minDelay < 5) {
      alert("Minimum delay must be at least 5 seconds to protect your Gmail sender reputation.");
      return;
    }

    if (maxDelay < minDelay) {
      alert("Maximum delay cannot be less than minimum delay.");
      return;
    }

    const isSchedulingLater = isScheduled || scheduleType === 'later';
    let targetScheduledIso: string | null = null;
    if (isSchedulingLater) {
      const scheduledDate = new Date(scheduledDateTime);
      if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        alert("Please select a future date and time for the scheduled campaign.");
        return;
      }
      targetScheduledIso = scheduledDate.toISOString();
    }

    // Deduplicate recipients by email to prevent double-sending
    let uniqueRecipients = [];
    const seenEmails = new Set();
    for (const c of selectedContacts) {
      const email = c.email.toLowerCase().trim();
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        uniqueRecipients.push(c);
      }
    }

    if (!allowResend) {
      const unemailedOnly = uniqueRecipients.filter(c => !c.hasBeenEmailed);
      if (unemailedOnly.length === 0) {
        alert("All selected recipients have already been emailed in past campaigns. Enable 'Allow re-sending' in campaign settings if you want to email them again.");
        return;
      }
      uniqueRecipients = unemailedOnly;
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

    const allAlreadyEmailed = uniqueRecipients.every(r => r.hasBeenEmailed);
    let effectiveAllowResend = allowResend;

    if (allAlreadyEmailed && !allowResend) {
      const confirmResend = window.confirm(
        "All selected contacts have already been emailed in past campaigns.\n\nWould you like to allow re-sending to these contacts?"
      );
      if (!confirmResend) {
        setIsUploading(false);
        return;
      }
      effectiveAllowResend = true;
    }

    try {
      await startCampaign({
        id: `camp_${Date.now()}`,
        name,
        subject,
        bodyTemplate: signatureRendered ? `${body}\n\n${signatureRendered}` : body,
        minDelay,
        maxDelay,
        recipients: uniqueRecipients,
        attachmentPath: uploadedPath,
        allowResend: effectiveAllowResend,
        scheduledAt: targetScheduledIso,
      });

      setIsUploading(false);
      navigate("/");
    } catch (err: any) {
      setIsUploading(false);
      alert(err.message || "Failed to start campaign.");
    }
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
          <div className="max-w-2xl space-y-4">
            <h3 className="text-lg font-bold">Select Recipients</h3>
            <div className="p-4 bg-gray-50 border border-border rounded-lg space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-sm">
                    {selectedContacts.length} Contacts Selected
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    {contacts.filter(c => !c.hasBeenEmailed).length.toLocaleString()} Available (Never Emailed) &bull; <span className="text-emerald-600 font-semibold">{contacts.filter(c => c.hasBeenEmailed).length.toLocaleString()} Already Emailed</span>
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-8 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-semibold"
                    onClick={() => {
                      const unemailedRecruiters = contacts.filter(c => c.isProtected && !c.hasBeenEmailed);
                      const next450 = unemailedRecruiters.slice(0, 450).map(c => c.id);
                      setSelectedContactIds(new Set(next450));
                    }}
                  >
                    Select Next 450 New Recruiters
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      const newContacts = contacts.filter(c => !c.hasBeenEmailed);
                      const next450 = newContacts.slice(0, 450).map(c => c.id);
                      setSelectedContactIds(new Set(next450));
                    }}
                  >
                    Select Next 450 (All New)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      const selectable = allowResend ? displayedContacts : displayedContacts.filter(c => !c.hasBeenEmailed);
                      const currentSelectableIds = new Set(selectable.map(c => c.id));
                      const isAllSelected = selectable.length > 0 && selectable.every(c => selectedContactIds.has(c.id));
                      
                      if (isAllSelected) {
                        const next = new Set(selectedContactIds);
                        currentSelectableIds.forEach(id => next.delete(id));
                        setSelectedContactIds(next);
                      } else {
                        const next = new Set(selectedContactIds);
                        currentSelectableIds.forEach(id => next.add(id));
                        setSelectedContactIds(next);
                      }
                    }}
                  >
                    {(allowResend ? displayedContacts : displayedContacts.filter(c => !c.hasBeenEmailed)).length > 0 && 
                     (allowResend ? displayedContacts : displayedContacts.filter(c => !c.hasBeenEmailed)).every(c => selectedContactIds.has(c.id)) 
                      ? 'Deselect Filtered' 
                      : 'Select Filtered'}
                  </Button>
                </div>
              </div>

              {/* Recipient Filter Tabs & Search */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                <div className="flex bg-gray-200/50 p-0.5 rounded-lg border border-border text-xs">
                  <button 
                    type="button"
                    onClick={() => setRecipientFilter('new')} 
                    className={cn("px-2.5 py-1 font-semibold rounded transition-colors", recipientFilter === 'new' ? 'bg-white shadow-sm text-primary' : 'text-secondary hover:text-text')}
                  >
                    Not Emailed ({contacts.filter(c => !c.hasBeenEmailed).length.toLocaleString()})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRecipientFilter('recruiters')} 
                    className={cn("px-2.5 py-1 font-semibold rounded transition-colors", recipientFilter === 'recruiters' ? 'bg-white shadow-sm text-purple-700' : 'text-secondary hover:text-purple-600')}
                  >
                    Recruiters ({contacts.filter(c => c.isProtected).length.toLocaleString()})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRecipientFilter('my')} 
                    className={cn("px-2.5 py-1 font-semibold rounded transition-colors", recipientFilter === 'my' ? 'bg-white shadow-sm text-text' : 'text-secondary hover:text-text')}
                  >
                    My Contacts ({contacts.filter(c => !c.isProtected).length.toLocaleString()})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRecipientFilter('all')} 
                    className={cn("px-2.5 py-1 font-semibold rounded transition-colors", recipientFilter === 'all' ? 'bg-white shadow-sm text-text' : 'text-secondary hover:text-text')}
                  >
                    All ({contacts.length.toLocaleString()})
                  </button>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <Input 
                    placeholder="Search name, email, company..." 
                    className="h-8 text-xs bg-white border-border"
                    value={recipientSearch}
                    onChange={e => setRecipientSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Recipients List */}
              <div className="max-h-72 overflow-y-auto border border-border rounded-md bg-white">
                {displayedContacts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-secondary">
                    No contacts match this filter.
                  </div>
                ) : (
                  displayedContacts.map(contact => (
                    <label 
                      key={contact.id} 
                      className={`flex items-center gap-3 p-2.5 border-b border-border last:border-0 hover:bg-gray-50/80 transition-colors ${
                        (contact.hasBeenEmailed && !allowResend) ? 'opacity-50 bg-gray-50/40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="accent-primary w-4 h-4 rounded"
                        checked={selectedContactIds.has(contact.id)}
                        disabled={contact.hasBeenEmailed && !allowResend}
                        onChange={(e) => {
                          if (contact.hasBeenEmailed && !allowResend) return;
                          const next = new Set(selectedContactIds);
                          if (e.target.checked) next.add(contact.id);
                          else next.delete(contact.id);
                          setSelectedContactIds(next);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-text truncate">{contact.name || contact.email}</p>
                          {contact.isProtected && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">
                              Recruiter
                            </span>
                          )}
                          {contact.hasBeenEmailed ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              allowResend ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              {allowResend ? 'Previously Emailed' : 'Already Emailed'}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-secondary truncate mt-0.5">
                          {contact.email}
                          {contact.variables?.company ? ` • ${contact.variables.company}` : ''}
                          {contact.variables?.role ? ` (${contact.variables.role})` : ''}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <label className="flex items-center gap-2.5 pt-2 border-t border-border cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="accent-primary w-4 h-4 rounded"
                  checked={allowResend}
                  onChange={(e) => setAllowResend(e.target.checked)}
                />
                <span className="text-xs font-medium text-text">
                  Allow re-sending to previously emailed contacts (for follow-ups or testing)
                </span>
              </label>
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
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-text">Sending Settings & Timer</h3>
              <p className="text-sm text-secondary">
                Configure human simulation delays and choose when this campaign starts.
              </p>
            </div>

            {/* Delay Interval Controls */}
            <div className="p-4 bg-white border border-border rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-text">Timer & Sending Delays</h4>
              </div>
              <p className="text-xs text-secondary">
                A randomized delay is added between each email send to prevent rate-limiting and simulate natural human behavior.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">Min Delay (seconds)</label>
                  <Input 
                    type="number"
                    min={5}
                    value={minDelay} 
                    onChange={e => setMinDelay(Math.max(5, Number(e.target.value)))}
                    className="h-9 text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">Recommended: &ge; 15s</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">Max Delay (seconds)</label>
                  <Input 
                    type="number"
                    min={minDelay}
                    value={maxDelay} 
                    onChange={e => setMaxDelay(Math.max(minDelay, Number(e.target.value)))}
                    className="h-9 text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">Recommended: &ge; 30s</span>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-secondary flex items-center justify-between">
                <span>Delay window: <strong className="text-text">{minDelay}s &ndash; {maxDelay}s</strong> per email</span>
                <span>Average: <strong className="text-primary font-bold">~{Math.round((minDelay + maxDelay) / 2)}s</strong></span>
              </div>
            </div>

            {/* Campaign Scheduling Mode */}
            <div className="p-4 bg-white border border-border rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-text">Campaign Start Schedule</h4>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScheduleType('now')}
                  className={cn(
                    "py-2 rounded-md transition-all flex items-center justify-center gap-1.5",
                    scheduleType === 'now' 
                      ? "bg-white shadow-sm text-primary" 
                      : "text-secondary hover:text-text"
                  )}
                >
                  <Rocket className="w-3.5 h-3.5" />
                  Send Immediately
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('later')}
                  className={cn(
                    "py-2 rounded-md transition-all flex items-center justify-center gap-1.5",
                    scheduleType === 'later' 
                      ? "bg-white shadow-sm text-indigo-600" 
                      : "text-secondary hover:text-text"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Schedule for Later
                </button>
              </div>

              {scheduleType === 'later' && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-semibold text-secondary">Select Start Date & Time</label>
                    {/* Quick presets */}
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { label: "+15m", mins: 15 },
                        { label: "+1h", mins: 60 },
                        { label: "+3h", mins: 180 },
                        { label: "Tomorrow 9 AM", tomorrowHour: 9 },
                        { label: "Tomorrow 2 PM", tomorrowHour: 14 }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            if (preset.tomorrowHour !== undefined) {
                              d.setDate(d.getDate() + 1);
                              d.setHours(preset.tomorrowHour, 0, 0, 0);
                            } else {
                              d.setMinutes(d.getMinutes() + preset.mins!);
                            }
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            setScheduledDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                          }}
                          className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-secondary hover:text-text rounded transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input 
                    type="datetime-local"
                    value={scheduledDateTime}
                    min={(() => {
                      const d = new Date();
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    })()}
                    onChange={e => setScheduledDateTime(e.target.value)}
                    className="h-9 text-sm bg-white"
                  />

                  {/* Scheduled info badge */}
                  {(() => {
                    const sched = new Date(scheduledDateTime);
                    const isValid = !isNaN(sched.getTime()) && sched.getTime() > Date.now();
                    if (!isValid) {
                      return (
                        <p className="text-xs text-red-500 font-medium">
                          Please pick a date and time in the future.
                        </p>
                      );
                    }
                    const diffMs = sched.getTime() - Date.now();
                    const diffMin = Math.round(diffMs / 60000);
                    const diffHours = Math.floor(diffMin / 60);
                    const diffDays = Math.floor(diffHours / 24);
                    const timeString = diffDays > 0 
                      ? `${diffDays}d ${diffHours % 24}h` 
                      : diffHours > 0 
                      ? `${diffHours}h ${diffMin % 60}m` 
                      : `${Math.max(1, diffMin)} minutes`;

                    return (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <div>
                          <span>Campaign will start automatically in <strong>{timeString}</strong></span>
                          <span className="block text-[11px] text-indigo-700/80 mt-0.5">
                            {sched.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {sched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Campaign Overview Card */}
            <div className="p-4 bg-primary-light/10 border border-primary/20 rounded-xl space-y-2">
              <h4 className="font-bold text-sm text-primary">Campaign Overview</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-secondary block">Campaign:</span>
                  <span className="font-semibold text-text truncate block">{name}</span>
                </div>
                <div>
                  <span className="text-secondary block">Recipients:</span>
                  <span className="font-semibold text-text">{selectedContacts.length.toLocaleString()} contacts</span>
                </div>
                <div>
                  <span className="text-secondary block">Delay Window:</span>
                  <span className="font-semibold text-text">{minDelay}s &ndash; {maxDelay}s per email</span>
                </div>
                <div>
                  <span className="text-secondary block">Total Send Time:</span>
                  <span className="font-semibold text-text">~{Math.round((selectedContacts.length * ((minDelay + maxDelay) / 2)) / 60)} minutes</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-primary/10 flex items-center justify-between">
                  <span className="text-secondary">Execution Plan:</span>
                  <span className="font-bold text-primary">
                    {scheduleType === 'later' ? `Scheduled for ${new Date(scheduledDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}` : 'Immediate Start'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 pt-2 items-center">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <div className="flex-1" />
              {scheduleType === 'later' ? (
                <Button 
                  onClick={() => handleStart(true)} 
                  disabled={isUploading} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 px-6 shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                  {isUploading ? "Scheduling..." : "Schedule Campaign"}
                </Button>
              ) : (
                <Button 
                  onClick={() => handleStart(false)} 
                  disabled={isUploading} 
                  className="bg-success hover:bg-success/90 text-white font-bold gap-2 px-6 shadow-sm"
                >
                  <Rocket className="w-4 h-4" />
                  {isUploading ? "Starting..." : "Start Campaign Now"}
                </Button>
              )}
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
