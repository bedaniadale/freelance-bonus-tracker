import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { BANKS, getBankById } from '../lib/banks';
import BankLogo from './BankLogo';
import { X, Loader2, ChevronDown, Check } from 'lucide-react';

export default function TransferToFinanceModal({ snapshot, phpRate, onClose, onSuccess }) {
  const [currency, setCurrency] = useState('USD');
  const [bankId, setBankId] = useState('gotyme');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedBank = getBankById(bankId);
  const phBanks = BANKS.filter(b => b.category === 'PH');
  const intlBanks = BANKS.filter(b => b.category === 'International');
  const otherBanks = BANKS.filter(b => b.category === 'Other');

  // Convert if PHP
  const amountToTransfer = currency === 'PHP' && phpRate ? snapshot.total_pay * phpRate : snapshot.total_pay;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const record = {
      job_id: null,
      is_freelance: true,
      project_name: "Bonus Tracker: " + snapshot.title,
      bank_id: bankId,
      amount: parseFloat(amountToTransfer),
      currency,
      date: new Date().toISOString().split('T')[0],
      notes: `${snapshot.qualified_count} qualified out of ${snapshot.posts?.length || 0} posts`
    };

    const { data, error: err } = await supabase.from('income_records').insert(record);
    
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSuccess(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-100">Add to Finance</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        
        <p className="text-sm text-slate-400 mb-6">You are adding the payout for <span className="font-semibold text-slate-200">{snapshot.title}</span> to your finance records.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Currency</label>
              <div className="flex gap-2 h-[42px]">
                {['USD', 'PHP'].map(c => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    disabled={c === 'PHP' && !phpRate}
                    title={c === 'PHP' && !phpRate ? "Loading rate..." : ""}
                    className={`flex-1 rounded-lg text-xs font-bold border transition-all ${currency === c ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 disabled:opacity-50'}`}>
                    {c === 'PHP' ? '₱' : '$'} {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Amount</label>
              <div className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-200 flex items-center">
                {currency === 'PHP' ? '₱' : '$'}{amountToTransfer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Destination Bank / Wallet</label>
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
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${bankId === bank.id ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300' : 'hover:bg-slate-800 text-slate-300'}`}>
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

          {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 p-2 rounded">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Add Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
