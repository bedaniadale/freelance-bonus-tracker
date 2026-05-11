import { NavLink } from 'react-router-dom';
import { TrendingUp, Wallet, BarChart2 } from 'lucide-react';

export default function BottomNav() {
  const base = 'flex flex-col items-center gap-1 py-2 px-4 text-xs font-medium transition-colors';
  const active = 'text-blue-400';
  const inactive = 'text-slate-500 hover:text-slate-300';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <TrendingUp className="w-5 h-5" />
          <span>Bonus</span>
        </NavLink>
        <NavLink to="/finance" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <Wallet className="w-5 h-5" />
          <span>Finance</span>
        </NavLink>
        <NavLink to="/summary" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <BarChart2 className="w-5 h-5" />
          <span>Summary</span>
        </NavLink>
      </div>
    </nav>
  );
}
