import { getBankLogo } from '../lib/banks';

export default function BankLogo({ bank, size = 'md', className = '' }) {
  const sz = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10';
  const pd = size === 'sm' ? 'p-1' : 'p-1.5';
  
  if (!bank || !bank.domain) return (
    <div className={`${sz} shrink-0 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 ${className}`}>
      {bank ? bank.name[0] : '?'}
    </div>
  );

  return (
    <div className={`relative ${sz} shrink-0 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm ${pd} ${className}`}>
      <img
        src={getBankLogo(bank.domain)}
        alt={bank.name}
        className="w-full h-full object-contain relative z-10"
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
      <div className="absolute inset-0 hidden items-center justify-center bg-slate-700 text-slate-300 text-xs font-bold z-0">
        {bank.name[0]}
      </div>
    </div>
  );
}
