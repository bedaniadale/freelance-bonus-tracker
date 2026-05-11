import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import BottomNav from './components/BottomNav'
import BonusTracker from './App'
import FinanceTracker from './pages/FinanceTracker'
import Summary from './pages/Summary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
        <div className="max-w-2xl mx-auto px-4 safe-area-top">
          <Routes>
            <Route path="/" element={<BonusTracker />} />
            <Route path="/finance" element={<FinanceTracker />} />
            <Route path="/summary" element={<Summary />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  </StrictMode>,
)
