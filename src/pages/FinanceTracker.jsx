import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BANKS, getBankById, getBankLogo } from '../lib/banks';
import { Plus, Trash2, Briefcase, ChevronDown, X, Loader2, DollarSign, Banknote } from 'lucide-react';

const CURRENCIES = ['PHP', 'USD'];

function BankLogo({ bank, size = 'md' }) {
  const sz = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  if (!bank || !bank.domain) return (
    <div className={`${sz} rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400`}>
      {bank ? bank.name[0] : '?'}
    </div>
  );
  return (
    <img
      src={getBankLogo(bank.domain)}
      alt={bank.name}
      className={`${sz} rounded-full object-contain bg-white p-0.5`}
      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
    />
  );
}

// ── Add Job Modal ──
function AddJobModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [employer, setEmployer] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('jobs').insert({ name: name.trim(), employer: employer.trim() || null, currency }).select().single();
    setSaving(false);
    if (error) { alert(error.message); return; }
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-100">Add New Job</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Job / Role Title *</label>
            <input autoFocus required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Social Media Manager" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Employer / Company</label>
            <input type="text" value={employer} onChange={e => setEmployer(e.target.value)} placeholder="Optional" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Default Currency</label>
            <div className="flex gap-2">
              {CURRENCIES.map(c => (
                <button key={c} type="button" onClick={() => setCurrency(c)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${currency === c ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  {c === 'PHP' ? '₱ PHP' : '$ USD'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Income Record Modal ──
function AddRecordModal({ jobs, onClose, onSave }) {
  const [jobId, setJobId] = useState('');
  const [isFreelance, setIsFreelance] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [bankId, setBankId] = useState('gotyme');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [localJobs, setLocalJobs] = useState(jobs);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const selectedBank = getBankById(bankId);
  const phBanks = BANKS.filter(b => b.category === 'PH');
  const intlBanks = BANKS.filter(b => b.category === 'International');
  const otherBanks = BANKS.filter(b => b.category === 'Other');

  const handleJobChange = (val) => {
    if (val === '__add_new__') { setShowAddJob(true); return; }
    setJobId(val);
    setIsFreelance(val === '__freelance__');
    if (val !== '__freelance__') {
      const job = localJobs.find(j => j.id === val);
      if (job) setCurrency(job.currency);
    }
  };

  const handleJobAdded = (newJob) => {
    setLocalJobs([...localJobs, newJob]);
    setJobId(newJob.id);
    setCurrency(newJob.currency);
    setShowAddJob(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    const record = {
      job_id: isFreelance ? null : (jobId || null),
      is_freelance: isFreelance,
      project_name: isFreelance ? projectName.trim() : null,
      bank_id: bankId,
      amount: parseFloat(amount),
      currency,
      date,
      notes: notes.trim() || null,
    };
    const { data, error } = await supabase.from('income_records').insert(record).select('*, jobs(name, employer)').single();
    setSaving(false);
    if (error) { alert(error.message); return; }
    onSave(data);
  };

  return (
    <>
      {showAddJob && <AddJobModal onClose={() => setShowAddJob(false)} onSave={handleJobAdded} />}
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-100">Add Income Record</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Income Source *</label>
              <select value={isFreelance ? '__freelance__' : jobId} onChange={e => handleJobChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="">— Select Job —</option>
                <option value="__freelance__">🔀 Independent Project</option>
                {localJobs.map(j => <option key={j.id} value={j.id}>{j.name}{j.employer ? ` · ${j.employer}` : ''}</option>)}
                <option value="__add_new__">➕ Add New Job…</option>
              </select>
            </div>
            {isFreelance && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Project Name</label>
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Logo Design for ABC Corp" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            {/* Amount + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Amount *</label>
                <input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Currency</label>
                <div className="flex gap-2 h-[42px]">
                  {CURRENCIES.map(c => (
                    <button key={c} type="button" onClick={() => setCurrency(c)}
                      className={`flex-1 rounded-lg text-xs font-bold border transition-all ${currency === c ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400'}`}>
                      {c === 'PHP' ? '₱' : '$'} {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Bank Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Bank / Wallet *</label>
              <button type="button" onClick={() => setShowBankPicker(!showBankPicker)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm flex items-center gap-3 hover:border-slate-600 transition-all">
                {selectedBank ? (
                  <>
                    <BankLogo bank={selectedBank} size="sm" />
                    <span className="text-slate-200">{selectedBank.name}</span>
                  </>
                ) : <span className="text-slate-500">Select bank or wallet…</span>}
                <ChevronDown className="w-4 h-4 text-slate-500 ml-auto" />
              </button>
              {showBankPicker && (
                <div className="mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 max-h-48 overflow-y-auto space-y-3">
                  {[['🇵🇭 Philippines', phBanks], ['🌐 International', intlBanks], ['Other', otherBanks]].map(([label, list]) => (
                    <div key={label}>
                      <p className="text-xs text-slate-500 font-semibold mb-2 px-1">{label}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {list.map(bank => (
                          <button key={bank.id} type="button" onClick={() => { setBankId(bank.id); setShowBankPicker(false); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${bankId === bank.id ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300' : 'hover:bg-slate-800 text-slate-300'}`}>
                            <BankLogo bank={bank} size="sm" />
                            <span className="truncate">{bank.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date *</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-200" />
            </div>
            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg text-sm font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save Record
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Main Finance Tracker Page ──
export default function FinanceTracker() {
  const [jobs, setJobs] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [activeTab, setActiveTab] = useState('records');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [jobsRes, recordsRes] = await Promise.all([
        supabase.from('jobs').select('*').order('created_at'),
        supabase.from('income_records').select('*, jobs(name, employer)').order('date', { ascending: false }).limit(50),
      ]);
      if (jobsRes.data) setJobs(jobsRes.data);
      if (recordsRes.data) setRecords(recordsRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const handleRecordAdded = (record) => {
    setRecords([record, ...records]);
    setShowAddRecord(false);
  };

  const handleJobAdded = (job) => {
    setJobs([...jobs, job]);
    setShowAddJob(false);
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await supabase.from('income_records').delete().eq('id', id);
    setRecords(records.filter(r => r.id !== id));
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Delete this job? Income records linked to it will be unlinked, not deleted.')) return;
    await supabase.from('jobs').delete().eq('id', id);
    setJobs(jobs.filter(j => j.id !== id));
  };

  // Totals
  const phpTotal = records.filter(r => r.currency === 'PHP').reduce((s, r) => s + parseFloat(r.amount), 0);
  const usdTotal = records.filter(r => r.currency === 'USD').reduce((s, r) => s + parseFloat(r.amount), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Finance Tracker</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track all your income sources</p>
        </div>
        <button onClick={() => setShowAddRecord(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {/* Summary Pills */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total PHP</p>
          <p className="text-xl font-bold text-emerald-400">₱{phpTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total USD</p>
          <p className="text-xl font-bold text-blue-400">${usdTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
        {[['records', 'Records'], ['jobs', 'My Jobs']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-400">No records yet</p>
              <p className="text-sm mt-1">Add your first income record</p>
            </div>
          ) : records.map(record => {
            const bank = getBankById(record.bank_id);
            return (
              <div key={record.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                <BankLogo bank={bank} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {record.is_freelance ? (record.project_name || 'Independent Project') : (record.jobs?.name || 'Unknown Job')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bank?.name} · {new Date(record.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {record.is_freelance && <span className="ml-2 bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded-full">Freelance</span>}
                  </p>
                  {record.notes && <p className="text-xs text-slate-600 mt-0.5 truncate">{record.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-base font-bold ${record.currency === 'PHP' ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {record.currency === 'PHP' ? '₱' : '$'}{parseFloat(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-600 hover:text-red-400 transition-colors mt-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          <button onClick={() => setShowAddJob(true)} className="w-full bg-slate-900/40 border border-slate-700 border-dashed rounded-xl p-4 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all flex items-center justify-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add New Job
          </button>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No jobs added yet</p>
            </div>
          ) : jobs.map(job => (
            <div key={job.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{job.name}</p>
                {job.employer && <p className="text-xs text-slate-500">{job.employer}</p>}
                <p className="text-xs text-slate-600 mt-0.5">{job.currency === 'PHP' ? '₱ PHP' : '$ USD'}</p>
              </div>
              <button onClick={() => handleDeleteJob(job.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddRecord && <AddRecordModal jobs={jobs} onClose={() => setShowAddRecord(false)} onSave={handleRecordAdded} />}
      {showAddJob && <AddJobModal onClose={() => setShowAddJob(false)} onSave={handleJobAdded} />}
    </div>
  );
}
