import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, History, CheckCircle, XCircle, TrendingUp, DollarSign, List, Save, RefreshCw, Loader2, Edit2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const FRANKFURTER_API = 'https://api.frankfurter.dev/v1/latest?from=USD&to=PHP';
const RATE_CACHE_KEY = 'fpbt_usdPhpRate';
const RATE_CACHE_TTL_MS = 60 * 60 * 1000;
const BONUS_AMOUNT = 100;
const VIEWS_THRESHOLD = 25000;
const COMMENTS_THRESHOLD = 320;

function extractShortcode(url) {
  try {
    const match = url.match(/(?:\/p\/|\/reel\/)([\w-]+)/);
    return match ? match[1] : null;
  } catch { return null; }
}

export default function App() {
  const [baseSalary, setBaseSalary] = useState(650);
  const [vault, setVault] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Post
  const [editingPostId, setEditingPostId] = useState(null);
  const [editValues, setEditValues] = useState({ views: '', comments: '' });

  // Exchange Rate
  const [phpRate, setPhpRate] = useState(() => {
    const cached = localStorage.getItem(RATE_CACHE_KEY);
    if (cached) { const { rate, timestamp } = JSON.parse(cached); if (Date.now() - timestamp < RATE_CACHE_TTL_MS) return rate; }
    return null;
  });
  const [rateUpdatedAt, setRateUpdatedAt] = useState(null);
  const [rateFetching, setRateFetching] = useState(false);
  const [rateError, setRateError] = useState(false);

  // Form
  const [link, setLink] = useState('');
  const [views, setViews] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Finalize modal
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [periodTitle, setPeriodTitle] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [expandedSnapshot, setExpandedSnapshot] = useState(null);

  // ── Load all data from Supabase on mount ──
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [settingsRes, vaultRes, snapshotsRes] = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('vault').select('*').order('added_at', { ascending: false }),
        supabase.from('snapshots').select('*, posts(*)').order('created_at', { ascending: false }),
      ]);
      if (settingsRes.data) {
        const sal = settingsRes.data.find(r => r.key === 'base_salary');
        if (sal) setBaseSalary(parseInt(sal.value, 10));
      }
      if (vaultRes.data) setVault(vaultRes.data);
      if (snapshotsRes.data) setHistory(snapshotsRes.data);
      setLoading(false);
    }
    loadData();
  }, []);

  // ── Save base salary ──
  const handleBaseSalaryChange = async (val) => {
    setBaseSalary(val);
    await supabase.from('settings').upsert({ key: 'base_salary', value: String(val) });
  };

  // ── Exchange rate ──
  const fetchRate = useCallback(async (force = false) => {
    if (rateFetching) return;
    if (!force) {
      const cached = localStorage.getItem(RATE_CACHE_KEY);
      if (cached) { const { rate, timestamp } = JSON.parse(cached); if (Date.now() - timestamp < RATE_CACHE_TTL_MS) { setPhpRate(rate); setRateUpdatedAt(new Date(timestamp)); return; } }
    }
    setRateFetching(true); setRateError(false);
    try {
      const res = await fetch(FRANKFURTER_API);
      const data = await res.json();
      const rate = data.rates.PHP;
      const now = Date.now();
      localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate, timestamp: now }));
      setPhpRate(rate); setRateUpdatedAt(new Date(now));
    } catch { setRateError(true); } finally { setRateFetching(false); }
  }, [rateFetching]);
  useEffect(() => { fetchRate(); }, []);

  const isQualified = (v, c) => v >= VIEWS_THRESHOLD || c >= COMMENTS_THRESHOLD;
  const qualifiedCount = vault.filter(p => p.qualified).length;
  const totalPay = baseSalary + qualifiedCount * BONUS_AMOUNT;

  // ── Add post ──
  const handleAddEntry = async (e) => {
    e.preventDefault(); setError('');
    const shortcode = extractShortcode(link);
    if (!shortcode) { setError('Invalid Instagram link. Must contain /p/ or /reel/'); return; }
    if (vault.some(p => p.shortcode === shortcode)) { setError('Already in the active vault.'); return; }
    for (const snap of history) {
      if (snap.posts?.some(p => p.shortcode === shortcode)) { setError('Already paid out in a previous period.'); return; }
    }
    const vCount = parseInt(views || 0, 10);
    const cCount = parseInt(comments || 0, 10);
    const newPost = { shortcode, link, views: vCount, comments: cCount, qualified: isQualified(vCount, cCount), added_at: new Date().toISOString() };
    setSaving(true);
    const { data, error: err } = await supabase.from('vault').insert(newPost).select().single();
    setSaving(false);
    if (err) { setError('Failed to save: ' + err.message); return; }
    setVault([data, ...vault]);
    setLink(''); setViews(''); setComments('');
  };

  // ── Edit post ──
  const startEditPost = (post) => {
    setEditingPostId(post.id);
    setEditValues({ views: post.views, comments: post.comments });
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditValues({ views: '', comments: '' });
  };

  const saveEditPost = async (id) => {
    const vCount = parseInt(editValues.views || 0, 10);
    const cCount = parseInt(editValues.comments || 0, 10);
    const qualified = isQualified(vCount, cCount);
    
    const updates = { views: vCount, comments: cCount, qualified };
    
    const { error: err } = await supabase.from('vault').update(updates).eq('id', id);
    if (err) { alert('Failed to update: ' + err.message); return; }
    
    setVault(vault.map(p => p.id === id ? { ...p, ...updates } : p));
    setEditingPostId(null);
  };

  // ── Remove post ──
  const handleRemoveEntry = async (id) => {
    await supabase.from('vault').delete().eq('id', id);
    setVault(vault.filter(p => p.id !== id));
  };

  // ── Finalize ──
  const openFinalizeModal = () => {
    if (!vault.length) return;
    const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    setPeriodTitle(fmt(new Date())); setShowFinalizeModal(true);
  };

  const handleFinalize = async () => {
    if (!periodTitle.trim()) return;
    setFinalizing(true);
    const snapshot = { title: periodTitle.trim(), date: new Date().toISOString(), base_salary: baseSalary, bonus: qualifiedCount * BONUS_AMOUNT, total_pay: totalPay, qualified_count: qualifiedCount };
    const { data: snap, error: snapErr } = await supabase.from('snapshots').insert(snapshot).select().single();
    if (snapErr) { setFinalizing(false); alert('Error: ' + snapErr.message); return; }
    const postsToInsert = vault.map(p => ({ snapshot_id: snap.id, shortcode: p.shortcode, link: p.link, views: p.views, comments: p.comments, qualified: p.qualified, added_at: p.added_at }));
    const { data: savedPosts } = await supabase.from('posts').insert(postsToInsert).select();
    await supabase.from('vault').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setHistory([{ ...snap, posts: savedPosts || [] }, ...history]);
    setVault([]); setShowFinalizeModal(false); setPeriodTitle(''); setFinalizing(false);
  };

  // ── Delete snapshot ──
  const handleDeleteSnapshot = async (id) => {
    if (!window.confirm('Delete this payout record?')) return;
    await supabase.from('snapshots').delete().eq('id', id);
    setHistory(history.filter(s => s.id !== id));
    if (expandedSnapshot === id) setExpandedSnapshot(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm">Loading your tracker…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <header className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">Performance & Bonus Tracker</h1>
            <p className="text-slate-400 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Track your freelance impact and earnings.</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-24 h-24" /></div>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Total Expected Pay</p>
            <div className="text-5xl font-black text-white tracking-tight flex items-baseline gap-1">
              <span className="text-3xl text-emerald-400">$</span>{totalPay}
            </div>
            <div className="mt-2 mb-3">
              {phpRate ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-amber-400">₱{(totalPay * phpRate).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">@{phpRate.toFixed(3)}</span>
                  <button onClick={() => fetchRate(true)} title="Refresh rate" className={`text-slate-500 hover:text-amber-400 transition-colors ${rateFetching ? 'animate-spin' : ''}`}><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="text-xs text-slate-500">{rateFetching ? 'Fetching live rate…' : rateError ? <span className="text-red-400">Rate unavailable <button onClick={() => fetchRate(true)} className="underline">retry</button></span> : 'Loading rate…'}</div>
              )}
              {rateUpdatedAt && <p className="text-xs text-slate-600 mt-0.5">Updated {rateUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
            <div className="text-sm text-slate-400">
              Base: <input type="number" value={baseSalary} onChange={(e) => handleBaseSalaryChange(parseInt(e.target.value) || 0)} className="w-16 bg-slate-800 text-white px-1 py-0.5 rounded border border-slate-700 outline-none focus:border-blue-500 ml-1 inline-block text-right" /> + Bonus: ${qualifiedCount * BONUS_AMOUNT}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-100"><Plus className="w-5 h-5 text-blue-400" /> Add New Post</h2>
              <form onSubmit={handleAddEntry} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Instagram Link</label>
                  <input type="url" required value={link} onChange={e => setLink(e.target.value)} placeholder="https://instagram.com/p/..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Comments <span className="text-amber-400 font-bold">*</span> <span className="ml-1 text-slate-600 normal-case font-normal">Bonus at &gt;= 320</span></label>
                  <input type="number" required min="0" value={comments} onChange={e => setComments(e.target.value)} placeholder="e.g. 325" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Views <span className="ml-1 text-slate-600 normal-case font-normal">Optional — add later</span></label>
                  <input type="number" min="0" value={views} onChange={e => setViews(e.target.value)} placeholder="Add at end of shift" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700" />
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-start gap-2"><XCircle className="w-5 h-5 shrink-0 mt-0.5" /><p>{error}</p></div>}
                <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Track Post
                </button>
              </form>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Qualification Rules</h3>
              <ul className="text-sm space-y-2 text-slate-500">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> {'>'} = 320 Comments <span className="text-xs text-amber-500/70 ml-1">(primary)</span></li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> {'>'} = 25,000 Views <span className="text-xs text-slate-600 ml-1">(optional)</span></li>
                <li className="mt-4 pt-4 border-t border-slate-800 italic">Posts meeting either condition earn a $100 bonus.</li>
              </ul>
            </div>
          </div>

          {/* Right: Vault + History */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <List className="w-6 h-6 text-indigo-400" /> The Vault
                  <span className="text-sm font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full ml-2">{vault.length} Active</span>
                </h2>
                <button onClick={openFinalizeModal} disabled={!vault.length} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save className="w-4 h-4" /> Finalize & Reset
                </button>
              </div>
              {vault.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4"><List className="w-8 h-8 text-slate-500" /></div>
                  <h3 className="text-lg font-medium text-slate-300 mb-1">Vault is empty</h3>
                  <p className="text-slate-500">Add a post to start tracking your performance.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vault.map(post => (
                    <div key={post.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded">{post.shortcode}</span>
                          <a href={post.link} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate transition-colors">View Post ↗</a>
                        </div>
                        {editingPostId === post.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input type="number" min="0" value={editValues.comments} onChange={e => setEditValues({ ...editValues, comments: e.target.value })} placeholder="Comments" className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-200" title="Comments" />
                            <input type="number" min="0" value={editValues.views} onChange={e => setEditValues({ ...editValues, views: e.target.value })} placeholder="Views" className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-200" title="Views" />
                            <button onClick={() => saveEditPost(post.id)} className="text-emerald-400 hover:text-emerald-300 px-3 py-1 rounded text-sm font-medium bg-emerald-500/10 border border-emerald-500/20">Save</button>
                            <button onClick={cancelEditPost} className="text-slate-400 hover:text-slate-300 px-3 py-1 rounded text-sm bg-slate-800 border border-slate-700">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 text-sm text-slate-300 mt-1">
                            <span title="Comments" className={post.comments >= COMMENTS_THRESHOLD ? 'text-amber-400 font-semibold' : ''}>💬 {post.comments.toLocaleString()}</span>
                            {post.views > 0 && <span title="Views" className={post.views >= VIEWS_THRESHOLD ? 'text-emerald-400 font-semibold' : ''}>👁 {post.views.toLocaleString()}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-800 sm:border-0">
                        {post.qualified
                          ? <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full uppercase tracking-wider mr-2"><CheckCircle className="w-3.5 h-3.5" /> Bonus +$100</div>
                          : <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold rounded-full uppercase tracking-wider mr-2">No Bonus</div>}
                        {editingPostId !== post.id && (
                          <button onClick={() => startEditPost(post)} className="text-slate-500 hover:text-blue-400 p-2 rounded-lg hover:bg-slate-800 transition-colors" title="Edit Post"><Edit2 className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => handleRemoveEntry(post.id)} className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800 transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {history.length > 0 && (
              <section className="pt-8 border-t border-slate-800">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-slate-300">
                    <History className="w-5 h-5 text-slate-400" /> Payout History
                    <span className="text-sm font-normal bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full ml-1">{history.length}</span>
                  </h2>
                </div>
                <div className="space-y-3">
                  {history.map(snapshot => {
                    const isOpen = expandedSnapshot === snapshot.id;
                    return (
                      <div key={snapshot.id} className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl overflow-hidden">
                        <button onClick={() => setExpandedSnapshot(isOpen ? null : snapshot.id)} className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${snapshot.qualified_count > 0 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100 truncate">{snapshot.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Saved {new Date(snapshot.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; {snapshot.posts?.length ?? 0} posts &bull; {snapshot.qualified_count} qualified</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-lg font-bold text-emerald-400">${snapshot.total_pay.toLocaleString()}</div>
                              <div className="text-xs text-slate-500">Base ${snapshot.base_salary} + Bonus ${snapshot.bonus}</div>
                            </div>
                            <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 border-t border-slate-800">
                            <div className="mt-4 space-y-2">
                              {(snapshot.posts || []).map(post => (
                                <div key={post.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-800/50 last:border-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded shrink-0">{post.shortcode}</span>
                                    <a href={post.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">View ↗</a>
                                  </div>
                                  <div className="text-slate-500 flex items-center gap-3 shrink-0">
                                    <span>💬 {post.comments}</span>
                                    {post.views > 0 && <span>👁 {post.views.toLocaleString()}</span>}
                                    {post.qualified ? <span className="text-emerald-400 font-semibold">+$100</span> : <span className="text-slate-600">—</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                              <button onClick={() => handleDeleteSnapshot(snapshot.id)} className="text-xs text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors">
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
            <p className="text-sm text-slate-400 mb-5">Give this pay period a name so you can find it in history.</p>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Period Title</label>
            <input autoFocus type="text" value={periodTitle} onChange={e => setPeriodTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFinalize()} placeholder="e.g. May 1–15, Week 3 April…" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all mb-2" />
            <p className="text-xs text-slate-600 mb-6">You can type anything — a date range, a month, a pay period number, etc.</p>
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-sm space-y-1">
              <div className="flex justify-between text-slate-400"><span>Posts</span><span className="text-slate-200 font-medium">{vault.length}</span></div>
              <div className="flex justify-between text-slate-400"><span>Qualified</span><span className="text-emerald-400 font-medium">{qualifiedCount}</span></div>
              <div className="flex justify-between text-slate-400 border-t border-slate-700 pt-2 mt-2"><span>Total Pay</span><span className="text-white font-bold text-base">${totalPay}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowFinalizeModal(false)} disabled={finalizing} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-lg transition-all">Cancel</button>
              <button onClick={handleFinalize} disabled={!periodTitle.trim() || finalizing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save & Clear Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
