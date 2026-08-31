'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { nextOccurrenceOfDay, prevOccurrenceOfDay, daysBetween } from '@/lib/quincena'
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

  async function updateCardField(id: string, field: 'cutoff_day' | 'due_day' | 'credit_limit', value: string) {
    const num = field === 'credit_limit' ? Number(value) || null : Math.min(31, Math.max(1, Number(value) || 1))
    await supabase.from('cards').update({ [field]: num }).eq('id', id)
    loadAll()
  }

  if (loading) return <div className="p-6 text-[var(--neu-text-dim)]">Cargando tarjetas…</div>

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const fmtDate = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  const metrics = cards.map(card => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const lastCutoff = prevOccurrenceOfDay(card.cutoff_day)
    const daysSinceCutoff = daysBetween(lastCutoff, today)
    return { card, daysSinceCutoff }
  })
  const recommendedId = metrics.length
    ? metrics.reduce((best, cur) => cur.daysSinceCutoff > best.daysSinceCutoff ? cur : best).card.id
    : null

  return (
    <div className="neu-raised max-w-xl p-6 mt-6 font-mono text-[var(--neu-text)]">
      <h2 className="text-lg mb-4 font-semibold">Tarjetas de crédito</h2>

      {cards.map(card => {
        const nextCutoff = nextOccurrenceOfDay(card.cutoff_day)
        const nextDue = nextOccurrenceOfDay(card.due_day)
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const daysUntilCutoff = daysBetween(today, nextCutoff)
        const daysUntilDue = daysBetween(today, nextDue)
        const spent = transactions.filter(t => t.card_id === card.id).reduce((s, t) => s + Number(t.amount), 0)
        const pct = card.credit_limit ? Math.min(100, (spent / card.credit_limit) * 100) : 0
        const isActive = card.id === recommendedId

        return (
          <div key={card.id} className={`neu-pressed p-4 mb-3 ${isActive ? 'ring-2 ring-emerald-400' : ''}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">{card.name}</span>
              <button onClick={() => removeCard(card.id)} className="text-rose-500 hover:text-rose-600 px-1 text-sm font-medium">Eliminar</button>
            </div>
            {isActive && <span className="inline-block bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full mb-2">Úsala ahora · cortó hace {metrics.find(m => m.card.id === card.id)!.daysSinceCutoff}d</span>}
            {daysUntilCutoff <= 3 && <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full mb-2 ml-1">Corte en {daysUntilCutoff}d</span>}
            <div className="text-xs text-[var(--neu-text-dim)] mb-1">Gastado este corte</div>
            <div className="text-xl mb-2">{money(spent)}{card.credit_limit ? <span className="text-sm text-[var(--neu-text-dim)]"> / {money(card.credit_limit)}</span> : null}</div>
            {card.credit_limit && (
              <div className="h-2 rounded-full overflow-hidden bg-[var(--neu-shadow-dark)]/30 mb-3">
                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="flex gap-3 flex-wrap text-xs text-[var(--neu-text-dim)]">
              <label className="flex items-center gap-1">Corte
                <input type="number" min={1} max={31} defaultValue={card.cutoff_day}
                  onBlur={e => updateCardField(card.id, 'cutoff_day', e.target.value)}
                  className="w-12 bg-transparent border-b border-[var(--neu-shadow-dark)] text-center focus:outline-none" />
                <span className="text-[10px]">({fmtDate(nextCutoff)})</span>
              </label>
              <label className="flex items-center gap-1">Pago
                <input type="number" min={1} max={31} defaultValue={card.due_day}
                  onBlur={e => updateCardField(card.id, 'due_day', e.target.value)}
                  className="w-12 bg-transparent border-b border-[var(--neu-shadow-dark)] text-center focus:outline-none" />
                <span className="text-[10px]">({fmtDate(nextDue)} · en {daysUntilDue}d)</span>
              </label>
              <label className="flex items-center gap-1">Límite
                <input type="number" defaultValue={card.credit_limit ?? ''}
                  onBlur={e => updateCardField(card.id, 'credit_limit', e.target.value)}
                  className="w-20 bg-transparent border-b border-[var(--neu-shadow-dark)] text-center focus:outline-none" />
              </label>
            </div>
          </div>
        )
      })}

      <div className="flex gap-2 flex-wrap mt-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la tarjeta"
          className="neu-input flex-1 min-w-[140px] px-3 py-2 text-sm" />
        <input type="number" value={newCutoff} onChange={e => setNewCutoff(e.target.value)} placeholder="Día corte"
          className="neu-input w-24 px-3 py-2 text-sm" />
        <input type="number" value={newDue} onChange={e => setNewDue(e.target.value)} placeholder="Día pago"
          className="neu-input w-24 px-3 py-2 text-sm" />
        <input type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)} placeholder="Límite"
          className="neu-input w-24 px-3 py-2 text-sm" />
        <button onClick={addCard} className="neu-btn px-4 py-2 text-sm text-emerald-700 font-medium">+ Agregar</button>
      </div>
    </div>
  )
}