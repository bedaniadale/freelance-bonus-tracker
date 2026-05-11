import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { BANKS, getBankById } from '../lib/banks';
import BankLogo from '../components/BankLogo';
import { BarChart2, Filter, X, Loader2, ChevronDown, DollarSign, Banknote } from 'lucide-react';

function fmt(amount, currency) {
  const sym = currency === 'PHP' ? '₱' : '$';
  return `${sym}${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function Summary() {
  const [records, setRecords] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [rangeType, setRangeType] = useState('month'); // 'month' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [jobsRes, recordsRes] = await Promise.all([
        supabase.from('jobs').select('*'),
        supabase.from('income_records').select('*, jobs(name, employer)').order('date', { ascending: false }),
      ]);
      if (jobsRes.data) setJobs(jobsRes.data);
      if (recordsRes.data) setRecords(recordsRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const d = r.date;
      if (rangeType === 'month' && selectedMonth) {
        if (!d.startsWith(selectedMonth)) return false;
      } else if (rangeType === 'custom') {
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
      if (filterBank && r.bank_id !== filterBank) return false;
      if (filterJob) {
        if (filterJob === '__freelance__' && !r.is_freelance) return false;
        if (filterJob !== '__freelance__' && r.job_id !== filterJob) return false;
      }
      if (filterCurrency && r.currency !== filterCurrency) return false;
      return true;
    });
  }, [records, rangeType, selectedMonth, dateFrom, dateTo, filterBank, filterJob, filterCurrency]);

  const phpTotal = filtered.filter(r => r.currency === 'PHP').reduce((s, r) => s + parseFloat(r.amount), 0);
  const usdTotal = filtered.filter(r => r.currency === 'USD').reduce((s, r) => s + parseFloat(r.amount), 0);

  // Group by bank
  const byBank = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.bank_id]) map[r.bank_id] = { php: 0, usd: 0, count: 0 };
      if (r.currency === 'PHP') map[r.bank_id].php += parseFloat(r.amount);
      else map[r.bank_id].usd += parseFloat(r.amount);
      map[r.bank_id].count++;
    });
    return Object.entries(map).sort((a, b) => (b[1].php + b[1].usd * 58) - (a[1].php + a[1].usd * 58));
  }, [filtered]);

  // Group by job
  const byJob = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const key = r.is_freelance ? '__freelance__' : (r.job_id || '__unknown__');
      const label = r.is_freelance ? 'Independent Projects' : (r.jobs?.name || 'Unlinked');
      if (!map[key]) map[key] = { label, php: 0, usd: 0, count: 0 };
      if (r.currency === 'PHP') map[key].php += parseFloat(r.amount);
      else map[key].usd += parseFloat(r.amount);
      map[key].count++;
    });
    return Object.entries(map).sort((a, b) => (b[1].php + b[1].usd * 58) - (a[1].php + a[1].usd * 58));
  }, [filtered]);

  const activeFilterCount = [filterBank, filterJob, filterCurrency].filter(Boolean).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  // ── FULL SCREEN STORY INVOICE ──
  if (showInvoice) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto flex flex-col font-sans">
        <button 
          onClick={() => setShowInvoice(false)} 
          className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 w-full max-w-md mx-auto flex flex-col pt-20 pb-12 px-4">
          
          <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden mb-8 shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-48 h-48 -mr-10 -mt-10" /></div>
            <p className="text-white/80 font-semibold tracking-widest uppercase text-[10px] mb-2">Earnings Summary</p>
            <h2 className="text-[2.5rem] font-black tracking-tight mb-6 leading-none">
              You've been<br/>paid
            </h2>
            
            {phpTotal > 0 && (
              <div className="mb-2">
                <span className="text-emerald-300 font-bold text-5xl tracking-tighter">₱{phpTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {usdTotal > 0 && (
              <div className="mb-6">
                <span className="text-blue-200 font-semibold text-2xl tracking-tight">+ ${usdTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-semibold bg-black/20 w-max px-4 py-2 rounded-full backdrop-blur-md mt-6">
               <Banknote className="w-4 h-4" /> {filtered.length} Records tracked
            </div>
          </div>

          <div className="px-2 space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase px-2">Transaction Details</h3>
            <div className="space-y-3">
              {filtered.map(record => {
                const bank = getBankById(record.bank_id);
                return (
                  <div key={record.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                    <BankLogo bank={bank} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-200 truncate">
                        {record.is_freelance ? (record.project_name || 'Independent Project') : (record.jobs?.name || '—')}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">{new Date(record.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {bank?.name}</p>
                    </div>
                    <p className={`text-base font-black shrink-0 tracking-tight ${record.currency === 'PHP' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {fmt(record.amount, record.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Summary</h1>
            <p className="text-slate-400 text-sm mt-0.5">{filtered.length} records in view</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showFilters || activeFilterCount > 0 ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>
            <Filter className="w-4 h-4" /> Filters {activeFilterCount > 0 && <span className="bg-violet-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>
        
        <button 
          onClick={() => setShowInvoice(true)}
          disabled={filtered.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Invoice Summary ✨
        </button>
      </div>

      {/* Date Range */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          {[['month', 'By Month'], ['custom', 'Custom Range']].map(([v, l]) => (
            <button key={v} onClick={() => setRangeType(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${rangeType === v ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>
        {rangeType === 'month' ? (
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 text-slate-200" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 text-slate-200" />
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-slate-300">Filters</p>
            {activeFilterCount > 0 && <button onClick={() => { setFilterBank(''); setFilterJob(''); setFilterCurrency(''); }} className="text-xs text-slate-500 hover:text-red-400">Clear all</button>}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Bank / Wallet</label>
            <select value={filterBank} onChange={e => setFilterBank(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none text-slate-200">
              <option value="">All Banks</option>
              {BANKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Job / Source</label>
            <select value={filterJob} onChange={e => setFilterJob(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none text-slate-200">
              <option value="">All Sources</option>
              <option value="__freelance__">Independent Projects</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Currency</label>
            <select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none text-slate-200">
              <option value="">All Currencies</option>
              <option value="PHP">₱ PHP</option>
              <option value="USD">$ USD</option>
            </select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-400">No data for this period</p>
          <p className="text-sm mt-1">Try adjusting your date range or filters</p>
        </div>
      ) : (
        <>
          {/* By Bank */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">By Bank / Wallet</h2>
            <div className="space-y-2">
              {byBank.map(([bankId, data]) => {
                const bank = getBankById(bankId);
                return (
                  <div key={bankId} className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <BankLogo bank={bank} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{bank?.name ?? bankId}</p>
                      <p className="text-xs text-slate-500">{data.count} record{data.count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      {data.php > 0 && <p className="text-emerald-400 font-semibold">₱{data.php.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>}
                      {data.usd > 0 && <p className="text-blue-400 font-semibold">${data.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Job */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">By Source / Job</h2>
            <div className="space-y-2">
              {byJob.map(([key, data]) => (
                <div key={key} className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${key === '__freelance__' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {key === '__freelance__' ? '🔀' : data.label?.[0] ?? 'J'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{data.label}</p>
                    <p className="text-xs text-slate-500">{data.count} record{data.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    {data.php > 0 && <p className="text-emerald-400 font-semibold">₱{data.php.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>}
                    {data.usd > 0 && <p className="text-blue-400 font-semibold">${data.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Record List */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">All Records</h2>
            <div className="space-y-2">
              {filtered.map(record => {
                const bank = getBankById(record.bank_id);
                return (
                  <div key={record.id} className="bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
                    <BankLogo bank={bank} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        {record.is_freelance ? (record.project_name || 'Independent Project') : (record.jobs?.name || '—')}
                        {record.is_freelance && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">Freelance</span>}
                      </p>
                      <p className="text-xs text-slate-600">{new Date(record.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {bank?.name}</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${record.currency === 'PHP' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {fmt(record.amount, record.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
