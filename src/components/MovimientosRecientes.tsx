'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { currentQuincenaIndex, quincenaFromIndex, toISODateString } from '@/lib/quincena'
import type { Transaction, Category, Card as CardType, Profile } from '@/lib/types'

export default function MovimientosRecientes() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    const { start } = quincenaFromIndex(currentQuincenaIndex())
    const quincenaStart = toISODateString(start)

    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('quincena_start', quincenaStart)
      .order('created_at', { ascending: false })
    const { data: cats } = await supabase.from('categories').select('*')
    const { data: cardData } = await supabase.from('cards').select('*')
    const { data: profileData } = await supabase.from('profiles').select('*')

    setTransactions(txns ?? [])
    setCategories(cats ?? [])
    setCards(cardData ?? [])
    setProfiles(profileData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  if (loading) return <div className="p-6 text-neutral-400 font-mono">Cargando movimientos…</div>

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const fmtTime = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="max-w-xl mt-6 font-mono text-neutral-100">
      <h2 className="text-lg mb-4">Movimientos recientes</h2>
      {transactions.length === 0 && (
        <div className="text-neutral-500 text-sm">Sin movimientos todavía en esta quincena.</div>
      )}
      <div className="flex flex-col">
        {transactions.map(t => {
          const cat = categories.find(c => c.id === t.category_id)
          const card = cards.find(c => c.id === t.card_id)
          const profile = profiles.find(p => p.id === t.profile_id)
          return (
            <div key={t.id} className="flex items-center gap-3 py-3 border-b border-neutral-800">
              <span className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs shrink-0">
                {profile?.name?.[0] ?? '?'}
              </span>
              <span className="text-[10px] uppercase border border-neutral-700 rounded px-1.5 py-0.5 text-neutral-500 shrink-0">
                {t.source}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">
                  {t.description} <span className="text-neutral-500 text-xs">{cat?.name ?? 'Sin categoría'}</span>
                </div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {t.priority && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.priority === 'necesidad' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'}`}>
                      {t.priority === 'necesidad' ? 'Necesidad' : 'Prescindible'}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-purple-700 text-purple-300">
                    {card?.name ?? 'Efectivo'}
                  </span>
                  {(t.tags ?? []).map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700 text-neutral-400">{tag}</span>
                  ))}
                </div>
              </div>
              <span className="text-sm shrink-0">{money(t.amount)}</span>
              <span className="text-[11px] text-neutral-500 shrink-0">{fmtTime(t.created_at)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}