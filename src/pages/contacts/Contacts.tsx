import { Header } from "@/components/Header/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Upload, Plus, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStore, Contact } from "@/store/useStore";
import { LIMITS } from "@/config/limits";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { parseCSV } from "@/lib/csv";
import { getAIProvider } from "@/lib/ai/aiService";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  if (localPart.length <= 3) return `***@${domain}`;
  return `${localPart.substring(0, 3)}***@${domain}`;
};

export function Contacts() {
  const { contacts, setContacts, searchQuery, setSearchQuery, settings, userPlan, setUpgradeDialogOpen } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newContactForm, setNewContactForm] = useState({ name: '', email: '', company: '', role: '', status: 'Active' });

  const [rawAIText, setRawAIText] = useState("");
  const [cleanedContacts, setCleanedContacts] = useState<any[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [aiError, setAIError] = useState("");

  const handleAddManualContact = () => {
    if (!newContactForm.name || !newContactForm.email) return;
    
    const existing = contacts.some(c => c.email.toLowerCase() === newContactForm.email.toLowerCase());
    if (existing) {
      alert("A contact with this email already exists.");
      return;
    }
    
    const names = newContactForm.name.split(' ');
    
    const newContact: Contact = {
      id: Date.now(),
      name: newContactForm.name,
      email: newContactForm.email,
      status: newContactForm.status as any,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      variables: {
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        company: newContactForm.company,
        role: newContactForm.role
      }
    };
    
    setContacts([...contacts, newContact]);
    setIsAddModalOpen(false);
    setNewContactForm({ name: '', email: '', company: '', role: '', status: 'Active' });
  };

  const handleAIClean = async () => {
    if (!rawAIText.trim()) return;
    const provider = getAIProvider(settings.aiProvider, settings.apiKey);
    if (!provider) {
      setAIError("Please configure your AI Provider in Settings first.");
      return;
    }
    
    setIsCleaning(true);
    setAIError("");
    try {
      const results = await provider.cleanContacts(rawAIText);
      setCleanedContacts(results);
    } catch (e: any) {
      setAIError(e.message || "Failed to clean contacts.");
    } finally {
      setIsCleaning(false);
    }
  };

  const acceptAIContacts = () => {
    const existingEmails = new Set(contacts.map(c => c.email.toLowerCase()));
    
    const validNewContacts = cleanedContacts.filter(c => {
      const email = (c.email || '').toLowerCase();
      if (!email || email === 'no-email@example.com') return true; // Keep placeholder ones or filter them? Let's just check uniqueness
      return !existingEmails.has(email);
    });

    const newContacts: Contact[] = validNewContacts.map((c, i) => ({
      id: Date.now() + i,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
      email: c.email || 'no-email@example.com',
      status: 'Active',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      variables: {
        firstName: c.firstName,
        lastName: c.lastName,
        company: c.company,
        role: c.role
      }
    }));
    setContacts([...contacts, ...newContacts]);
    setIsAIModalOpen(false);
    setRawAIText("");
    setCleanedContacts([]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await parseCSV(file);
    if (result.errors.length > 0) {
      console.warn("CSV Parsing Errors:", result.errors);
      // In a real app we'd show a toast here
    }
    
    if (result.contacts.length > 0) {
      const existingEmails = new Set(contacts.map(c => c.email.toLowerCase()));
      const uniqueNewContacts = result.contacts.filter(c => !existingEmails.has(c.email.toLowerCase()));
      
      if (uniqueNewContacts.length === 0) {
        alert("All imported contacts already exist in your list.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (userPlan === 'FREE' && contacts.length + uniqueNewContacts.length > LIMITS.FREE.MAX_CONTACTS) {
        setUpgradeDialogOpen(true, `Importing these contacts exceeds the free limit of ${LIMITS.FREE.MAX_CONTACTS}. Upgrade to GMailer Plus (₹25/month) for unlimited contacts.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      setContacts([...contacts, ...uniqueNewContacts]);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    const exportableContacts = contacts.filter(c => !c.isProtected);
    if (exportableContacts.length === 0) {
      alert("No exportable contacts found. Protected premium contacts cannot be exported.");
      return;
    }
    const csvRows = ["Name,Email,Company,Role,Status"];
    exportableContacts.forEach(c => {
      const company = c.variables?.company || '';
      const role = c.variables?.role || '';
      csvRows.push(`"${c.name}","${c.email}","${company}","${role}","${c.status}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gmailer_contacts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const lowerQuery = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery) ||
        c.status.toLowerCase().includes(lowerQuery)
    );
  }, [contacts, searchQuery]);
  return (
    <div className="flex flex-col h-full w-full bg-background relative border-r border-border min-w-[800px]">
      <Header />
      <div className="p-8 pt-4 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text">Contacts</h2>
          <div className="flex items-center gap-3">
            <Button onClick={handleExport} variant="outline" className="text-secondary bg-white shadow-sm border-border rounded-lg h-10 px-4 flex items-center gap-2 hover:text-text hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export
            </Button>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button 
              variant="outline" 
              className="text-primary bg-primary-light/5 border-primary/20 shadow-sm rounded-lg h-10 px-4 flex items-center gap-2 hover:bg-primary-light/10"
              onClick={() => {
                if (userPlan === 'FREE') {
                  setUpgradeDialogOpen(true, "AI Contact Cleaner is available in GMailer Plus. Connect your own Gemini or Groq API key and unlock AI features for just ₹25/month.");
                } else {
                  setIsAIModalOpen(true);
                }
              }}
            >
              <Sparkles className="w-4 h-4" /> AI Import
            </Button>
            <Button 
              variant="outline" 
              className="text-secondary bg-white shadow-sm border-border rounded-lg h-10 px-4 flex items-center gap-2 hover:text-text hover:bg-gray-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
            <Button 
              variant="outline" 
              className={cn(
                "shadow-sm rounded-lg h-10 px-4 flex items-center gap-2",
                userPlan === 'MAX' 
                  ? "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100"
                  : "text-purple-600 bg-purple-50/50 border-purple-200/50 hover:bg-purple-50"
              )}
              onClick={() => {
                if (userPlan === 'MAX') {
                  const hasImported = contacts.some(c => c.isProtected);
                  if (hasImported) {
                    alert("You have already imported the premium recruiter database.");
                    return;
                  }
                  
                  const premiumContacts: Contact[] = Array.from({ length: 4000 }).map((_, i) => ({
                    id: Date.now() + i,
                    name: `Premium Recruiter ${i + 1}`,
                    email: `recruiter${i + 1}@toptech.com`,
                    status: 'Active',
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    variables: { company: 'Top Tech', role: 'Technical Recruiter' },
                    isProtected: true
                  }));
                  
                  setContacts([...contacts, ...premiumContacts]);
                } else {
                  setUpgradeDialogOpen(true, "The 4,000 Recruiter Email Database is exclusively available in the GMailer Max tier. Upgrade to Max for ₹99/month.");
                }
              }}
            >
              <Download className="w-4 h-4" /> 
              {userPlan === 'MAX' ? "Download Recruiter Database" : "Get 4,000 Recruiters"}
            </Button>
            <Button 
              className="bg-primary hover:bg-primary-hover text-white shadow-soft rounded-lg h-10 px-4 flex items-center gap-2"
              onClick={() => {
                if (userPlan === 'FREE' && contacts.length >= LIMITS.FREE.MAX_CONTACTS) {
                  setUpgradeDialogOpen(true, `You've reached the free limit of ${LIMITS.FREE.MAX_CONTACTS} contacts. Upgrade to GMailer Plus (₹25/month) for unlimited contacts.`);
                } else {
                  setIsAddModalOpen(true);
                }
              }}
            >
              <Plus className="w-4 h-4" /> Add Contact
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-soft flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-4 bg-gray-50/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
              <Input 
                placeholder="Search contacts..." 
                className="pl-9 bg-white border-border h-10 rounded-lg shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="bg-white border-border rounded-lg h-10 px-4 text-secondary shadow-sm">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-border">
                  <TableHead className="w-[300px] font-semibold text-secondary">Name</TableHead>
                  <TableHead className="font-semibold text-secondary">Status</TableHead>
                  <TableHead className="font-semibold text-secondary text-right">Date Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-secondary">
                      No contacts found matching "{searchQuery}".
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id} className="border-border hover:bg-gray-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 border border-border">
                            <AvatarFallback className="bg-white text-secondary font-medium">{contact.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text">{contact.name}</span>
                              {contact.isProtected && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-[10px] h-4 py-0 px-1.5 flex items-center gap-1">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Protected
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-secondary">
                              {contact.isProtected ? maskEmail(contact.email) : contact.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "font-medium",
                          contact.status === 'Active' ? 'bg-green-50 text-success-light border-green-200' :
                          contact.status === 'Bounced' ? 'bg-red-50 text-danger border-red-200' :
                          'bg-amber-50 text-warning border-amber-200'
                        )}>
                          {contact.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-secondary font-medium">
                        {contact.date}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-4 border-t border-border bg-gray-50/50 flex items-center justify-between">
            <span className="text-sm text-secondary font-medium">
              Showing {filteredContacts.length} of {contacts.length} contacts
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white text-secondary border-border" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="bg-white text-secondary border-border" disabled>Next</Button>
            </div>
          </div>
        </div>
      </div>

      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-4xl rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">AI Contact Cleaner</h2>
              </div>
              <button onClick={() => { setIsAIModalOpen(false); setCleanedContacts([]); }} className="text-secondary hover:text-text">
                <ArrowRight className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">1. Paste Messy Text</h3>
                  <p className="text-sm text-secondary mb-2">Paste raw lists, jumbled roles, or unstructured text. The AI will extract the data.</p>
                  <textarea 
                    className="w-full h-[300px] p-4 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="John Google recruiter john@gmail.com&#10;Alice CEO startup alice@example.com"
                    value={rawAIText}
                    onChange={(e) => setRawAIText(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleAIClean} 
                  disabled={isCleaning || !rawAIText.trim()}
                  className="w-full"
                >
                  {isCleaning ? "Analyzing text..." : "Clean Contacts"}
                </Button>
                {aiError && <p className="text-sm text-danger font-semibold mt-2">{aiError}</p>}
              </div>

              <div className="flex-1 space-y-4">
                <h3 className="font-semibold mb-2">2. Review & Accept</h3>
                <div className="h-[300px] border border-border rounded-lg overflow-y-auto bg-gray-50/50 p-4">
                  {cleanedContacts.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-secondary text-sm">
                      Processed contacts will appear here
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cleanedContacts.map((c, i) => (
                        <div key={i} className="bg-white p-3 rounded border border-border shadow-sm text-sm">
                          <p><strong>Name:</strong> {c.firstName} {c.lastName}</p>
                          <p><strong>Email:</strong> {c.email}</p>
                          <p><strong>Company:</strong> {c.company}</p>
                          <p><strong>Role:</strong> {c.role}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {cleanedContacts.length > 0 && (
                  <Button onClick={acceptAIContacts} className="w-full bg-success hover:bg-success/90 text-white">
                    Accept & Import {cleanedContacts.length} Contacts
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold">Add Contact</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-secondary hover:text-text">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Full Name *</label>
                <Input 
                  placeholder="e.g. Jane Doe" 
                  value={newContactForm.name}
                  onChange={e => setNewContactForm({ ...newContactForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Email Address *</label>
                <Input 
                  placeholder="e.g. jane@example.com" 
                  type="email"
                  value={newContactForm.email}
                  onChange={e => setNewContactForm({ ...newContactForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Company</label>
                <Input 
                  placeholder="e.g. Acme Corp" 
                  value={newContactForm.company}
                  onChange={e => setNewContactForm({ ...newContactForm, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Role</label>
                <Input 
                  placeholder="e.g. CEO" 
                  value={newContactForm.role}
                  onChange={e => setNewContactForm({ ...newContactForm, role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">Status</label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newContactForm.status}
                  onChange={e => setNewContactForm({ ...newContactForm, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Bounced">Bounced</option>
                  <option value="Unsubscribed">Unsubscribed</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddManualContact} 
                className="bg-primary text-white hover:bg-primary-hover"
                disabled={!newContactForm.name || !newContactForm.email}
              >
                Save Contact
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
