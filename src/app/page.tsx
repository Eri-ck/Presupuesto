'use client'

import { useState } from 'react'
import { QuincenaProvider } from '@/lib/QuincenaContext'
import QuincenaNavigator from '@/components/QuincenaNavigator'
import IngresoHogar from '@/components/IngresoHogar'
import CategoriasHogar from '@/components/CategoriasHogar'
import TarjetasCredito from '@/components/TarjetasCredito'
import MetasAhorro from '@/components/MetasAhorro'
import MovimientosRecientes from '@/components/MovimientosRecientes'

type Tab = 'home' | 'tarjetas' | 'ahorros'

export default function Home() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <QuincenaProvider>
      <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:px-10 sm:py-10">
        <div className="w-full max-w-5xl">
          <QuincenaNavigator />

          <div className="flex gap-2 mb-8">
            <button onClick={() => setTab('home')} className={tab === 'home' ? 'neu-btn-primary px-5 py-2 text-sm' : 'neu-btn px-5 py-2 text-sm'}>Home</button>
            <button onClick={() => setTab('tarjetas')} className={tab === 'tarjetas' ? 'neu-btn-primary px-5 py-2 text-sm' : 'neu-btn px-5 py-2 text-sm'}>Tarjetas</button>
            <button onClick={() => setTab('ahorros')} className={tab === 'ahorros' ? 'neu-btn-primary px-5 py-2 text-sm' : 'neu-btn px-5 py-2 text-sm'}>Ahorros</button>
          </div>

          {tab === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <IngresoHogar />
              <div className="flex flex-col gap-6">
                <CategoriasHogar />
                <MovimientosRecientes />
              </div>
            </div>
          )}
          {tab === 'tarjetas' && <TarjetasCredito />}
          {tab === 'ahorros' && <MetasAhorro />}
        </div>
      </div>
    </QuincenaProvider>
  )
}