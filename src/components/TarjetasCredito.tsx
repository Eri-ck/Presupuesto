'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { nextOccurrenceOfDay, prevOccurrenceOfDay, daysBetween, isoWeekNumber } from '@/lib/quincena'
import type { Card, Transaction } from '@/lib/types'

export default function TarjetasCredito() {
  const supabase = createClient()
  const [cards, setCards] = useState<Card[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newCutoff, setNewCutoff] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newLimit, setNewLimit] = useState('')

  async function loadAll() {
    setLoading(true)
    const { data: cardData } = await supabase.from('cards').select('*').order('created_at', { ascending: true })
    const { data: txnData } = await supabase.from('transactions').select('*').not('card_id', 'is', null)
    setCards(cardData ?? [])
    setTransactions(txnData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function addCard() {
    if (!newName.trim()) return
    const cutoff_day = Math.min(31, Math.max(1, Number(newCutoff) || 1))
    const due_day = Math.min(31, Math.max(1, Number(newDue) || 1))
    const credit_limit = Number(newLimit) || null
    await supabase.from('cards').insert({ name: newName.trim(), cutoff_day, due_day, credit_limit })
    setNewName(''); setNewCutoff(''); setNewDue(''); setNewLimit('')
    loadAll()
  }

  async function removeCard(id: string) {
    await supabase.from('cards').delete().eq('id', id)
    loadAll()
  }

  if (loading) return <div className="p-6 text-neutral-400 font-mono">Cargando tarjetas…</div>

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const fmtDate = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  const activeIdx = cards.length ? isoWeekNumber(new Date()) % cards.length : -1

  return (
    <div className="max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 mt-6 font-mono text-neutral-100">
      <h2 className="text-lg mb-4">Tarjetas de crédito</h2>

      {cards.map((card, i) => {
        const nextCutoff = nextOccurrenceOfDay(card.cutoff_day)
        const nextDue = nextOccurrenceOfDay(card.due_day)
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const daysUntilCutoff = daysBetween(today, nextCutoff)
        const daysUntilDue = daysBetween(today, nextDue)
        const spent = transactions.filter(t => t.card_id === card.id).reduce((s, t) => s + Number(t.amount), 0)
        const pct = card.credit_limit ? Math.min(100, (spent / card.credit_limit) * 100) : 0
        const isActive = i === activeIdx

        return (
          <div key={card.id} className={`border rounded-lg p-4 mb-3 bg-neutral-950 ${isActive ? 'border-emerald-700' : 'border-neutral-800'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">{card.name}</span>
              <button onClick={() => removeCard(card.id)} className="text-neutral-500 hover:text-rose-400 px-1">×</button>
            </div>
            {isActive && <span className="inline-block bg-emerald-900 text-emerald-300 text-xs px-2 py-0.5 rounded-full mb-2">Tarjeta de la semana</span>}
            <div className="flex justify-between text-xs text-neutral-400 mb-2">
              <span>Corte: {fmtDate(nextCutoff)} · en {daysUntilCutoff}d</span>
              <span>Pago: {fmtDate(nextDue)} · en {daysUntilDue}d</span>
            </div>
            <div className="text-xs text-neutral-500 mb-1">Gastado este corte</div>
            <div className="text-xl mb-2">{money(spent)}{card.credit_limit ? <span className="text-sm text-neutral-500"> / {money(card.credit_limit)}</span> : null}</div>
            {card.credit_limit && (
              <div className="h-1.5 bg-neutral-800 rounded overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        )
      })}

      <div className="flex gap-2 flex-wrap mt-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la tarjeta"
          className="flex-1 min-w-[140px] bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <input type="number" value={newCutoff} onChange={e => setNewCutoff(e.target.value)} placeholder="Día corte"
          className="w-24 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <input type="number" value={newDue} onChange={e => setNewDue(e.target.value)} placeholder="Día pago"
          className="w-24 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <input type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)} placeholder="Límite"
          className="w-24 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <button onClick={addCard} className="bg-emerald-800 text-emerald-200 px-3 py-1 rounded text-sm">+ Agregar</button>
      </div>
    </div>
  )
}