'use client'

import { useState } from 'react'
import { QuincenaProvider } from '@/lib/QuincenaContext'
import QuincenaNavigator from '@/components/QuincenaNavigator'
import IngresoHogar from '@/components/IngresoHogar'
import CategoriasHogar from '@/components/CategoriasHogar'
import TarjetasCredito from '@/components/TarjetasCredito'
import MetasAhorro from '@/components/MetasAhorro'
import RegistrarGasto from '@/components/RegistrarGasto'
import MovimientosRecientes from '@/components/MovimientosRecientes'

type Tab = 'home' | 'tarjetas' | 'ahorros'

export default function Home() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <QuincenaProvider>
      <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:px-8 sm:py-10">
        <div className="w-full max-w-xl">
          <QuincenaNavigator />

          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab('home')} className={tab === 'home' ? 'neu-btn-primary px-4 py-2 text-sm' : 'neu-btn px-4 py-2 text-sm text-[var(--neu-text-dim)]'}>Home</button>
            <button onClick={() => setTab('tarjetas')} className={tab === 'tarjetas' ? 'neu-btn-primary px-4 py-2 text-sm' : 'neu-btn px-4 py-2 text-sm text-[var(--neu-text-dim)]'}>Tarjetas</button>
            <button onClick={() => setTab('ahorros')} className={tab === 'ahorros' ? 'neu-btn-primary px-4 py-2 text-sm' : 'neu-btn px-4 py-2 text-sm text-[var(--neu-text-dim)]'}>Ahorros</button>
          </div>

          {tab === 'home' && (
            <>
              <IngresoHogar />
              <CategoriasHogar />
              <RegistrarGasto />
              <MovimientosRecientes />
            </>
          )}
          {tab === 'tarjetas' && <TarjetasCredito />}
          {tab === 'ahorros' && <MetasAhorro />}
        </div>
      </div>
    </QuincenaProvider>
  )
}