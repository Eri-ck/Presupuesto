'use client'

import { useQuincena } from '@/lib/QuincenaContext'
import { formatQuincenaLabel } from '@/lib/quincena'

export default function QuincenaNavigator() {
  const { viewedIndex, currentIndex, goToQuincena, goToToday } = useQuincena()
  const diff = viewedIndex - currentIndex

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--neu-accent)' }} />
          <span className="headline text-lg tracking-tight">Cuenta Clara</span>
        </div>
        <span className="eyebrow">Control de gastos · familia</span>
      </div>

      <div className="eyebrow mb-2">
        {diff === 0 && 'Quincena actual'}
        {diff < 0 && 'Historial'}
        {diff > 0 && 'Proyección a futuro'}
      </div>

      <h1 className="headline text-4xl sm:text-6xl mb-6 leading-tight">
        {formatQuincenaLabel(viewedIndex)}
      </h1>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => goToQuincena(-1)} className="neu-btn w-10 h-10 flex items-center justify-center text-sm">◀</button>
        <button onClick={goToToday} className="neu-btn px-5 py-2 text-sm">Hoy</button>
        <button onClick={() => goToQuincena(1)} className="neu-btn w-10 h-10 flex items-center justify-center text-sm">▶</button>
        {diff !== 0 && (
          <span className="pill text-[10px] px-3 py-1.5 ml-1">
            {diff < 0 ? 'Ya pasó' : 'Aún no llega'}
          </span>
        )}
      </div>
    </div>
  )
}