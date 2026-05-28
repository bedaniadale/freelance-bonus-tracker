import { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

function extractShortcode(url) {
  try {
    const match = url.match(/(?:\/p\/|\/reel\/)([\w-]+)/);
    return match ? match[1] : null;
  } catch { return null; }
}

export default function PostChecker() {
  const [link, setLink] = useState('');
  const [status, setStatus] = useState(null); // 'idle', 'loading', 'found_vault', 'found_history', 'not_found', 'error', 'invalid'
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const checkPost = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setResultData(null);
    setErrorMessage('');

    const shortcode = extractShortcode(link);
    if (!shortcode) {
      setStatus('invalid');
      setErrorMessage('Invalid Instagram link. Must contain /p/ or /reel/');
      return;
    }

    try {
      // Check vault
      const { data: vaultData, error: vaultError } = await supabase
        .from('vault')
        .select('*')
        .eq('shortcode', shortcode)
        .maybeSingle();

      if (vaultError) throw vaultError;

      if (vaultData) {
        setStatus('found_vault');
        setResultData(vaultData);
        return;
      }

      // Check history (posts table)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, snapshots(*)')
        .eq('shortcode', shortcode)
        .maybeSingle();

      if (postsError) throw postsError;

      if (postsData) {
        setStatus('found_history');
        setResultData(postsData);
        return;
      }

      setStatus('not_found');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="py-4 md:py-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">Post Checker</h1>
        <p className="text-sm md:text-base text-slate-400 flex items-center gap-2">Verify if an Instagram post has already been tracked or paid out.</p>
      </header>

      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg">
        <form onSubmit={checkPost} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Instagram Link</label>
            <div className="relative">
              <input 
                type="url" 
                required 
                value={link} 
                onChange={e => setLink(e.target.value)} 
                placeholder="https://instagram.com/p/..." 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
              />
              <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={status === 'loading' || !link} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} 
            Check Post
          </button>
        </form>
      </div>

      {status && status !== 'loading' && status !== 'idle' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Result</h3>
          
          {status === 'invalid' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-semibold mb-1">Invalid Link</h4>
                <p className="text-sm text-slate-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-semibold mb-1">Error Checking Post</h4>
                <p className="text-sm text-slate-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {status === 'not_found' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-lg font-semibold text-emerald-400 mb-1">Clear to Track</h4>
              <p className="text-sm text-emerald-200/70">This post is neither in the active vault nor in the payout history.</p>
            </div>
          )}

          {status === 'found_vault' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
              <div className="bg-amber-500/20 p-2 rounded-full shrink-0">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div className="w-full">
                <h4 className="text-amber-400 font-semibold mb-1 text-lg">Already in Vault</h4>
                <p className="text-sm text-slate-300 mb-3">This post is currently in your active vault waiting to be finalized.</p>
                <div className="bg-slate-950/50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
                  <div className="text-slate-500">Shortcode</div>
                  <div className="text-slate-200 text-right font-mono">{resultData.shortcode}</div>
                  <div className="text-slate-500">Added On</div>
                  <div className="text-slate-200 text-right">{new Date(resultData.added_at).toLocaleDateString()}</div>
                  <div className="text-slate-500">Comments</div>
                  <div className="text-slate-200 text-right">💬 {resultData.comments?.toLocaleString() || 0}</div>
                  <div className="text-slate-500">Views</div>
                  <div className="text-slate-200 text-right">👁 {resultData.views?.toLocaleString() || 0}</div>
                  <div className="text-slate-500">Status</div>
                  <div className="text-right">
                    {resultData.qualified ? (
                      <span className="text-emerald-400 font-medium">Qualified</span>
                    ) : (
                      <span className="text-slate-400">Not Qualified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'found_history' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 flex items-start gap-4">
              <div className="bg-emerald-500/20 p-2 rounded-full shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="w-full">
                <h4 className="text-emerald-400 font-semibold mb-1 text-lg">Already Paid Out</h4>
                <p className="text-sm text-slate-300 mb-3">This post is in your history and has already been processed in a previous period.</p>
                <div className="bg-slate-950/50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
                  <div className="text-slate-500">Period</div>
                  <div className="text-slate-200 text-right font-medium">{resultData.snapshots?.title || 'Unknown Snapshot'}</div>
                  <div className="text-slate-500">Finalized On</div>
                  <div className="text-slate-200 text-right">{new Date(resultData.snapshots?.date || resultData.added_at).toLocaleDateString()}</div>
                  <div className="text-slate-500">Comments</div>
                  <div className="text-slate-200 text-right">💬 {resultData.comments?.toLocaleString() || 0}</div>
                  <div className="text-slate-500">Views</div>
                  <div className="text-slate-200 text-right">👁 {resultData.views?.toLocaleString() || 0}</div>
                  <div className="text-slate-500">Status</div>
                  <div className="text-right">
                    {resultData.qualified ? (
                      <span className="text-emerald-400 font-medium">Earned Bonus</span>
                    ) : (
                      <span className="text-slate-400">No Bonus</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
