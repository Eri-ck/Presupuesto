'use client'

import { useQuincena } from '@/lib/QuincenaContext'
import { formatQuincenaLabel } from '@/lib/quincena'

export default function QuincenaNavigator() {
  const { viewedIndex, currentIndex, goToQuincena, goToToday } = useQuincena()
  const diff = viewedIndex - currentIndex

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-[var(--neu-text)] mb-2">{formatQuincenaLabel(viewedIndex)}</h1>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => goToQuincena(-1)} className="neu-btn px-3 py-1 text-sm">◀</button>
        <button onClick={goToToday} className="neu-btn px-3 py-1 text-sm">Hoy</button>
        <button onClick={() => goToQuincena(1)} className="neu-btn px-3 py-1 text-sm">▶</button>
        {diff < 0 && <span className="text-xs px-2 py-1 rounded-full bg-[var(--neu-shadow-dark)]/30 text-[var(--neu-text-dim)]">Historial</span>}
        {diff > 0 && <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Futuro · proyección</span>}
      </div>
    </div>
  )
}