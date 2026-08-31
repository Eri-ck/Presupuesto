'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { currentQuincenaIndex } from './quincena'

interface QuincenaContextType {
  viewedIndex: number
  currentIndex: number
  goToQuincena: (delta: number) => void
  goToToday: () => void
}

const QuincenaContext = createContext<QuincenaContextType | null>(null)

export function QuincenaProvider({ children }: { children: ReactNode }) {
  const currentIndex = currentQuincenaIndex()
  const [viewedIndex, setViewedIndex] = useState(currentIndex)

  function goToQuincena(delta: number) {
    setViewedIndex(prev => prev + delta)
  }
  function goToToday() {
    setViewedIndex(currentIndex)
  }

  return (
    <QuincenaContext.Provider value={{ viewedIndex, currentIndex, goToQuincena, goToToday }}>
      {children}
    </QuincenaContext.Provider>
  )
}

export function useQuincena() {
  const ctx = useContext(QuincenaContext)
  if (!ctx) throw new Error('useQuincena debe usarse dentro de QuincenaProvider')
  return ctx
}