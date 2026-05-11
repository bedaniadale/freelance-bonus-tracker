import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, History, CheckCircle, XCircle, TrendingUp, DollarSign, List, Save, RefreshCw } from 'lucide-react';

const FRANKFURTER_API = 'https://api.frankfurter.dev/v1/latest?from=USD&to=PHP';
const RATE_CACHE_KEY = 'fpbt_usdPhpRate';
const RATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const BONUS_AMOUNT = 100;
const VIEWS_THRESHOLD = 25000;
const COMMENTS_THRESHOLD = 320;

function extractShortcode(url) {
  try {
    const match = url.match(/(?:\/p\/|\/reel\/)([\w-]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [baseSalary, setBaseSalary] = useState(() => {
    const saved = localStorage.getItem('fpbt_baseSalary');
    return saved ? parseInt(saved, 10) : 650;
  });

  const [vault, setVault] = useState(() => {
    const saved = localStorage.getItem('fpbt_vault');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('fpbt_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Exchange Rate State
  const [phpRate, setPhpRate] = useState(() => {
    const cached = localStorage.getItem(RATE_CACHE_KEY);
    if (cached) {
      const { rate, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < RATE_CACHE_TTL_MS) return rate;
    }
    return null;
  });
  const [rateUpdatedAt, setRateUpdatedAt] = useState(null);
  const [rateFetching, setRateFetching] = useState(false);
  const [rateError, setRateError] = useState(false);

  // Entry Form State
  const [link, setLink] = useState('');
  const [views, setViews] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  // Finalize Modal State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [periodTitle, setPeriodTitle] = useState('');

  // History view — expanded snapshot ID
  const [expandedSnapshot, setExpandedSnapshot] = useState(null);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('fpbt_baseSalary', baseSalary);
  }, [baseSalary]);

  useEffect(() => {
    localStorage.setItem('fpbt_vault', JSON.stringify(vault));
  }, [vault]);

  useEffect(() => {
    localStorage.setItem('fpbt_history', JSON.stringify(history));
  }, [history]);

  // Fetch live USD→PHP rate, with 1-hour localStorage cache
  const fetchRate = useCallback(async (force = false) => {
    if (rateFetching) return;
    if (!force) {
      const cached = localStorage.getItem(RATE_CACHE_KEY);
      if (cached) {
        const { rate, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < RATE_CACHE_TTL_MS) {
          setPhpRate(rate);
          setRateUpdatedAt(new Date(timestamp));
          return;
        }
      }
    }
    setRateFetching(true);
    setRateError(false);
    try {
      const res = await fetch(FRANKFURTER_API);
      const data = await res.json();
      const rate = data.rates.PHP;
      const now = Date.now();
      localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate, timestamp: now }));
      setPhpRate(rate);
      setRateUpdatedAt(new Date(now));
    } catch {
      setRateError(true);
    } finally {
      setRateFetching(false);
    }
  }, [rateFetching]);

  useEffect(() => { fetchRate(); }, []);

  const isQualified = (v, c) => {
    return (v >= VIEWS_THRESHOLD) || (c >= COMMENTS_THRESHOLD);
  };

  const qualifiedCount = vault.filter(post => post.qualified).length;
  const totalPay = baseSalary + (qualifiedCount * BONUS_AMOUNT);

  const handleAddEntry = (e) => {
    e.preventDefault();
    setError('');

    const shortcode = extractShortcode(link);
    if (!shortcode) {
      setError('Invalid Instagram link. Must contain /p/ or /reel/');
      return;
    }

    // Check for duplicates in Vault
    if (vault.some(post => post.shortcode === shortcode)) {
      setError('This post is already in the active vault.');
      return;
    }

    // Check for duplicates in History
    for (const snapshot of history) {
      if (snapshot.posts.some(post => post.shortcode === shortcode)) {
        setError('This post was already paid out in a previous period.');
        return;
      }
    }

    const vCount = parseInt(views || 0, 10);
    const cCount = parseInt(comments || 0, 10);

    const newPost = {
      id: Date.now().toString(),
      shortcode,
      link,
      views: vCount,
      comments: cCount,
      qualified: isQualified(vCount, cCount),
      addedAt: new Date().toISOString(),
    };

    setVault([newPost, ...vault]);
    setLink('');
    setViews('');
    setComments('');
  };

  const handleRemoveEntry = (id) => {
    setVault(vault.filter(post => post.id !== id));
  };

  const openFinalizeModal = () => {
    if (vault.length === 0) return;
    // Pre-fill title with a reasonable default
    const now = new Date();
    const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    setPeriodTitle(fmt(now));
    setShowFinalizeModal(true);
  };

  const handleFinalize = () => {
    if (!periodTitle.trim()) return;
    const newSnapshot = {
      id: Date.now().toString(),
      title: periodTitle.trim(),
      date: new Date().toISOString(),
      baseSalary,
      bonus: qualifiedCount * BONUS_AMOUNT,
      totalPay,
      qualifiedCount,
      posts: vault
    };
    setHistory([newSnapshot, ...history]);
    setVault([]);
    setShowFinalizeModal(false);
    setPeriodTitle('');
  };

  const handleDeleteSnapshot = (id) => {
    if (window.confirm('Delete this payout record? This cannot be undone.')) {
      setHistory(history.filter(s => s.id !== id));
      if (expandedSnapshot === id) setExpandedSnapshot(null);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to delete all history? This cannot be undone.")) {
      setHistory([]);
      setExpandedSnapshot(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-brand/30">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Dashboard */}
        <header className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">
              Performance & Bonus Tracker
            </h1>
            <p className="text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Track your freelance impact and earnings.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="w-24 h-24" />
             </div>
             <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Total Expected Pay</p>
             <div className="text-5xl font-black text-white tracking-tight flex items-baseline gap-1">
                <span className="text-3xl text-emerald-400">$</span>{totalPay}
             </div>

             {/* PHP Conversion */}
             <div className="mt-2 mb-3">
               {phpRate ? (
                 <div className="flex items-center gap-2">
                   <span className="text-xl font-bold text-amber-400">
                     ₱{(totalPay * phpRate).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </span>
                   <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                     @{phpRate.toFixed(3)}
                   </span>
                   <button
                     onClick={() => fetchRate(true)}
                     title="Refresh rate"
                     className={`text-slate-500 hover:text-amber-400 transition-colors ${rateFetching ? 'animate-spin' : ''}`}
                   >
                     <RefreshCw className="w-3.5 h-3.5" />
                   </button>
                 </div>
               ) : (
                 <div className="text-xs text-slate-500">
                   {rateFetching ? 'Fetching live rate…' : rateError ? (
                     <span className="text-red-400">Rate unavailable <button onClick={() => fetchRate(true)} className="underline">retry</button></span>
                   ) : 'Loading rate…'}
                 </div>
               )}
               {rateUpdatedAt && (
                 <p className="text-xs text-slate-600 mt-0.5">
                   Updated {rateUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
               )}
             </div>

             <div className="text-sm text-slate-400">
                Base: <input 
                  type="number" 
                  value={baseSalary} 
                  onChange={(e) => setBaseSalary(parseInt(e.target.value) || 0)}
                  className="w-16 bg-slate-800 text-white px-1 py-0.5 rounded border border-slate-700 outline-none focus:border-blue-500 ml-1 inline-block text-right"
                /> + Bonus: ${qualifiedCount * BONUS_AMOUNT}
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-100">
                <Plus className="w-5 h-5 text-blue-400" /> Add New Post
              </h2>
              <form onSubmit={handleAddEntry} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Instagram Link</label>
                  <input 
                    type="url" required
                    value={link} onChange={e => setLink(e.target.value)}
                    placeholder="https://instagram.com/p/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Comments <span className="text-amber-400 font-bold">*</span>
                    <span className="ml-2 text-slate-600 normal-case font-normal">Bonus at {'>='} 320</span>
                  </label>
                  <input 
                    type="number" required min="0"
                    value={comments} onChange={e => setComments(e.target.value)}
                    placeholder="e.g. 325"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Views
                    <span className="ml-2 text-slate-600 normal-case font-normal">Optional — add later</span>
                  </label>
                  <input 
                    type="number" min="0"
                    value={views} onChange={e => setViews(e.target.value)}
                    placeholder="Add at end of shift"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-start gap-2">
                    <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Track Post
                </button>
              </form>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
               <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                 <History className="w-4 h-4" /> Qualification Rules
               </h3>
               <ul className="text-sm space-y-2 text-slate-500">
                 <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> {'>='} 320 Comments <span className="text-xs text-amber-500/70 ml-1">(primary)</span></li>
                 <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> {'>='} 25,000 Views <span className="text-xs text-slate-600 ml-1">(optional)</span></li>
                 <li className="mt-4 pt-4 border-t border-slate-800 italic">Posts meeting either condition earn a $100 bonus.</li>
               </ul>
            </div>
          </div>

          {/* Right Column: Vault & History */}
          <div className="lg:col-span-2 space-y-8">
            {/* The Vault */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <List className="w-6 h-6 text-indigo-400" /> The Vault
                  <span className="text-sm font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full ml-2">
                    {vault.length} Active
                  </span>
                </h2>
                <button 
                  onClick={openFinalizeModal}
                  disabled={vault.length === 0}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" /> Finalize & Reset
                </button>
              </div>

              {vault.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
                    <List className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-300 mb-1">Vault is empty</h3>
                  <p className="text-slate-500">Add a post to start tracking your performance.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vault.map(post => (
                    <div key={post.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 group shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded">
                            {post.shortcode}
                          </span>
                          <a href={post.link} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate transition-colors">
                            View Post ↗
                          </a>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-300">
                          <span title="Comments" className={post.comments >= COMMENTS_THRESHOLD ? 'text-amber-400 font-semibold' : ''}>💬 {post.comments.toLocaleString()}</span>
                          {post.views > 0 && <span title="Views">👁 {post.views.toLocaleString()}</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-800 sm:border-0">
                        {post.qualified ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                            <CheckCircle className="w-3.5 h-3.5" /> Bonus +$100
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                            No Bonus
                          </div>
                        )}
                        <button 
                          onClick={() => handleRemoveEntry(post.id)}
                          className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Remove from vault"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* History View */}
            {history.length > 0 && (
              <section className="pt-8 border-t border-slate-800">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-slate-300">
                    <History className="w-5 h-5 text-slate-400" /> Payout History
                    <span className="text-sm font-normal bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full ml-1">{history.length}</span>
                  </h2>
                  <button 
                    onClick={handleClearHistory}
                    className="text-xs text-slate-500 hover:text-red-400 underline underline-offset-2"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-3">
                  {history.map(snapshot => {
                    const isOpen = expandedSnapshot === snapshot.id;
                    return (
                      <div key={snapshot.id} className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl overflow-hidden">
                        {/* Snapshot Header — always visible, clickable to expand */}
                        <button
                          onClick={() => setExpandedSnapshot(isOpen ? null : snapshot.id)}
                          className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${snapshot.qualifiedCount > 0 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100 truncate">
                                {snapshot.title || new Date(snapshot.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Saved {new Date(snapshot.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; {snapshot.posts.length} posts &bull; {snapshot.qualifiedCount} qualified
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-lg font-bold text-emerald-400">${snapshot.totalPay.toLocaleString()}</div>
                              <div className="text-xs text-slate-500">Base ${snapshot.baseSalary} + Bonus ${snapshot.bonus}</div>
                            </div>
                            <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </button>

                        {/* Expandable post list */}
                        {isOpen && (
                          <div className="px-5 pb-5 border-t border-slate-800">
                            <div className="mt-4 space-y-2">
                              {snapshot.posts.map(post => (
                                <div key={post.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-800/50 last:border-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded shrink-0">{post.shortcode}</span>
                                    <a href={post.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">
                                      View ↗
                                    </a>
                                  </div>
                                  <div className="text-slate-500 flex items-center gap-3 shrink-0">
                                    <span>💬 {post.comments}</span>
                                    {post.views > 0 && <span>👁 {post.views.toLocaleString()}</span>}
                                    {post.qualified
                                      ? <span className="text-emerald-400 font-semibold">+$100</span>
                                      : <span className="text-slate-600">—</span>
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={() => handleDeleteSnapshot(snapshot.id)}
                                className="text-xs text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" /> Delete Record
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-100 mb-1">Finalize Period</h3>
            <p className="text-sm text-slate-400 mb-5">
              Give this pay period a name so you can identify it in history.
            </p>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Period Title</label>
            <input
              autoFocus
              type="text"
              value={periodTitle}
              onChange={e => setPeriodTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFinalize()}
              placeholder="e.g. May 1–15, Week 3 April…"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all mb-2"
            />
            <p className="text-xs text-slate-600 mb-6">You can type anything — a date range, a month, a pay period number, etc.</p>

            {/* Summary */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-sm space-y-1">
              <div className="flex justify-between text-slate-400"><span>Posts</span><span className="text-slate-200 font-medium">{vault.length}</span></div>
              <div className="flex justify-between text-slate-400"><span>Qualified</span><span className="text-emerald-400 font-medium">{qualifiedCount}</span></div>
              <div className="flex justify-between text-slate-400 border-t border-slate-700 pt-2 mt-2"><span>Total Pay</span><span className="text-white font-bold text-base">${totalPay}</span></div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={!periodTitle.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Save & Clear Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
