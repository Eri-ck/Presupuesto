'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { nextOccurrenceOfDay, prevOccurrenceOfDay, daysBetween } from '@/lib/quincena'
import type { Card, Transaction } from '@/lib/types'

interface InstallmentPurchase {
  id: string
  card_id: string
  description: string
  total_amount: number
  months: number
  purchase_date: string
}

export default function TarjetasCredito() {
  const supabase = createClient()
  const [cards, setCards] = useState<Card[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [installments, setInstallments] = useState<InstallmentPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newCutoff, setNewCutoff] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newLimit, setNewLimit] = useState('')

  const [showMsi, setShowMsi] = useState<string | null>(null)
  const [msiDesc, setMsiDesc] = useState('')
  const [msiTotal, setMsiTotal] = useState('')
  const [msiMonths, setMsiMonths] = useState('3')
  const [msiDate, setMsiDate] = useState('2026-08-31')

  async function loadAll() {
    setLoading(true)
    const cardRes = await supabase.from('cards').select('*').order('created_at', { ascending: true })
    const txnRes = await supabase.from('transactions').select('*').not('card_id', 'is', null)
    const msiRes = await supabase.from('installment_purchases').select('*').order('purchase_date', { ascending: false })
    setCards(cardRes.data ?? [])
    setTransactions(txnRes.data ?? [])
    setInstallments(msiRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    setMsiDate(new Date().toISOString().slice(0, 10))
  }, [])

  async function addCard() {
    if (!newName.trim()) return
    const cutoffDay = Math.min(31, Math.max(1, Number(newCutoff) || 1))
    const dueDay = Math.min(31, Math.max(1, Number(newDue) || 1))
    const creditLimit = Number(newLimit) || null
    await supabase.from('cards').insert({
      name: newName.trim(),
      cutoff_day: cutoffDay,
      due_day: dueDay,
      credit_limit: creditLimit,
    })
    setNewName('')
    setNewCutoff('')
    setNewDue('')
    setNewLimit('')
    loadAll()
  }

  async function removeCard(id: string) {
    await supabase.from('cards').delete().eq('id', id)
    loadAll()
  }

  async function updateCutoffDay(id: string, value: string) {
    const num = Math.min(31, Math.max(1, Number(value) || 1))
    await supabase.from('cards').update({ cutoff_day: num }).eq('id', id)
    loadAll()
  }

  async function updateDueDay(id: string, value: string) {
    const num = Math.min(31, Math.max(1, Number(value) || 1))
    await supabase.from('cards').update({ due_day: num }).eq('id', id)
    loadAll()
  }

  async function updateCreditLimit(id: string, value: string) {
    const num = Number(value) || null
    await supabase.from('cards').update({ credit_limit: num }).eq('id', id)
    loadAll()
  }

  async function addInstallment(cardId: string) {
    const total = Number(msiTotal)
    const months = Math.max(1, Number(msiMonths) || 1)
    if (!msiDesc.trim() || !total || total <= 0) return
    await supabase.from('installment_purchases').insert({
      card_id: cardId,
      description: msiDesc.trim(),
      total_amount: total,
      months: months,
      purchase_date: msiDate,
    })
    setMsiDesc('')
    setMsiTotal('')
    setMsiMonths('3')
    setMsiDate(new Date().toISOString().slice(0, 10))
    setShowMsi(null)
    loadAll()
  }

  async function removeInstallment(id: string) {
    await supabase.from('installment_purchases').delete().eq('id', id)
    loadAll()
  }

  function money(n: number) {
    return '$' + Math.round(n).toLocaleString('es-MX')
  }

  function fmtDate(d: Date) {
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  function monthsElapsed(purchaseDateStr: string) {
    const purchase = new Date(purchaseDateStr + 'T00:00:00')
    const today = new Date()
    return (today.getFullYear() - purchase.getFullYear()) * 12 + (today.getMonth() - purchase.getMonth())
  }

  function installmentInfo(plan: InstallmentPurchase) {
    const elapsed = monthsElapsed(plan.purchase_date)
    const current = Math.min(plan.months, elapsed + 1)
    const finished = elapsed >= plan.months
    const monthlyAmount = plan.total_amount / plan.months
    return { current: current, finished: finished, monthlyAmount: monthlyAmount }
  }

  if (loading) {
    return <div className="p-6 text-[var(--neu-text-dim)]">Cargando tarjetas…</div>
  }

  const metrics = cards.map(card => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastCutoff = prevOccurrenceOfDay(card.cutoff_day)
    const daysSinceCutoff = daysBetween(lastCutoff, today)
    return { card: card, daysSinceCutoff: daysSinceCutoff }
  })

  let recommendedId = null
  if (metrics.length > 0) {
    let best = metrics[0]
    for (let i = 1; i < metrics.length; i++) {
      if (metrics[i].daysSinceCutoff > best.daysSinceCutoff) {
        best = metrics[i]
      }
    }
    recommendedId = best.card.id
  }

  return (
    <div className="neu-raised max-w-xl p-6 mt-6 font-mono text-[var(--neu-text)]">
      <h2 className="text-lg font-semibold mb-4" style={{ color: '#534ab7' }}>Tarjetas de crédito</h2>

      {cards.map(card => {
        const nextCutoff = nextOccurrenceOfDay(card.cutoff_day)
        const nextDue = nextOccurrenceOfDay(card.due_day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const daysUntilCutoff = daysBetween(today, nextCutoff)
        const daysUntilDue = daysBetween(today, nextDue)

        const cardInstallments = installments.filter(function (p) { return p.card_id === card.id })
        const activeInstallments = cardInstallments.filter(function (p) { return !installmentInfo(p).finished })
        let installmentMonthlyTotal = 0
        for (let i = 0; i < activeInstallments.length; i++) {
          installmentMonthlyTotal = installmentMonthlyTotal + installmentInfo(activeInstallments[i]).monthlyAmount
        }

        let spentTxns = 0
        for (let i = 0; i < transactions.length; i++) {
          if (transactions[i].card_id === card.id) {
            spentTxns = spentTxns + Number(transactions[i].amount)
          }
        }
        const spent = spentTxns + installmentMonthlyTotal
        const pct = card.credit_limit ? Math.min(100, (spent / card.credit_limit) * 100) : 0
        const isActive = card.id === recommendedId
        const cardRingClass = isActive ? 'neu-pressed p-4 mb-3 ring-2 ring-emerald-400' : 'neu-pressed p-4 mb-3'

        let cutoffDaysForCard = 0
        for (let i = 0; i < metrics.length; i++) {
          if (metrics[i].card.id === card.id) {
            cutoffDaysForCard = metrics[i].daysSinceCutoff
          }
        }

        return (
          <div key={card.id} className={cardRingClass}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">{card.name}</span>
              <button onClick={function () { removeCard(card.id) }} className="neu-btn-danger text-xs px-2 py-1">Eliminar</button>
            </div>

            {isActive && (
              <span className="inline-block bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full mb-2">
                Úsala ahora, cortó hace {cutoffDaysForCard}d
              </span>
            )}
            {daysUntilCutoff <= 3 && (
              <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full mb-2 ml-1">
                Corte en {daysUntilCutoff}d
              </span>
            )}

            <div className="text-xs text-[var(--neu-text-dim)] mb-1">Gastado este corte (incluye MSI del mes)</div>
            <div className="text-xl mb-2">
              {money(spent)}
              {card.credit_limit ? <span className="text-sm text-[var(--neu-text-dim)]"> / {money(card.credit_limit)}</span> : null}
            </div>

            {card.credit_limit ? (
              <div className="h-2 rounded-full overflow-hidden bg-[var(--neu-shadow-dark)]/30 mb-3">
                <div className="h-full bg-emerald-500" style={{ width: pct + '%' }} />
              </div>
            ) : null}

            <div className="flex gap-3 flex-wrap text-xs text-[var(--neu-text-dim)] mb-3">
              <label className="flex items-center gap-1">
                Corte
                <input type="number" min={1} max={31} defaultValue={card.cutoff_day}
                  onBlur={function (e) { updateCutoffDay(card.id, e.target.value) }}
                  className="w-12 bg-transparent border-b border-[var(--neu-shadow-dark)] text-center focus:outline-none" />
                <span className="text-[10px]">({fmtDate(nextCutoff)})</span>
              </label>
              <label className="flex items-center gap-1">
                Pago
                <input type="number" min={1} max={31} defaultValue={card.due_day}
                  onBlur={function (e) { updateDueDay(card.id, e.target.value) }}
                  className="w-12 bg-transparent border-b border-[var(--neu-shadow-dark)] text-center focus:outline-none" />
                <span className="text-[10px]">({fmtDate(nextDue)}, en {daysUntilDue}d)</span>
              </label>
              <label className="flex items-center gap-1">
                Límite
                <input type="number" defaultValue={card.credit_limit ?? ''}
                  onBlur={function (e) { updateCreditLimit(card.id, e.target.value) }}
                  className="w-20 bg-transparent border-b border-[var(--neu-shadow-dark)] text-center focus:outline-none" />
              </label>
            </div>

            {cardInstallments.length > 0 && (
              <div className="mb-3">
                <div className="text-xs uppercase text-[var(--neu-text-dim)] mb-1 tracking-wide">Meses sin intereses</div>
                {cardInstallments.map(function (plan) {
                  const info = installmentInfo(plan)
                  const statusClass = info.finished ? 'text-[var(--neu-text-dim)]' : 'text-purple-700'
                  const statusText = info.finished ? 'Pagada' : 'Pago ' + info.current + ' de ' + plan.months + ' · ' + money(info.monthlyAmount)
                  return (
                    <div key={plan.id} className="flex items-center justify-between text-xs py-1">
                      <span>{plan.description}</span>
                      <div className="flex items-center gap-2">
                        <span className={statusClass}>{statusText}</span>
                        <button onClick={function () { removeInstallment(plan.id) }} className="neu-btn-danger text-xs px-2 py-0.5">×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {showMsi === card.id ? (
              <div className="flex flex-col gap-2 mt-2">
                <input value={msiDesc} onChange={function (e) { setMsiDesc(e.target.value) }} placeholder="Descripción de la compra"
                  className="neu-input px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <input type="number" value={msiTotal} onChange={function (e) { setMsiTotal(e.target.value) }} placeholder="Monto total"
                    className="neu-input px-3 py-2 text-sm flex-1" />
                  <input type="number" value={msiMonths} onChange={function (e) { setMsiMonths(e.target.value) }} placeholder="Meses"
                    className="neu-input w-20 px-3 py-2 text-sm" />
                </div>
                <input type="date" value={msiDate} onChange={function (e) { setMsiDate(e.target.value) }}
                  className="neu-input px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <button onClick={function () { addInstallment(card.id) }} className="neu-btn-primary px-4 py-2 text-sm flex-1">Guardar</button>
                  <button onClick={function () { setShowMsi(null) }} className="neu-btn px-4 py-2 text-sm text-[var(--neu-text-dim)]">Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={function () { setShowMsi(card.id) }} className="neu-btn px-3 py-1.5 text-xs text-[var(--neu-text-dim)]">
                + Compra a meses sin intereses
              </button>
            )}
          </div>
        )
      })}

      <div className="flex gap-2 flex-wrap mt-2">
        <input value={newName} onChange={function (e) { setNewName(e.target.value) }} placeholder="Nombre de la tarjeta"
          className="neu-input flex-1 min-w-[140px] px-3 py-2 text-sm" />
        <input type="number" value={newCutoff} onChange={function (e) { setNewCutoff(e.target.value) }} placeholder="Día corte"
          className="neu-input w-24 px-3 py-2 text-sm" />
        <input type="number" value={newDue} onChange={function (e) { setNewDue(e.target.value) }} placeholder="Día pago"
          className="neu-input w-24 px-3 py-2 text-sm" />
        <input type="number" value={newLimit} onChange={function (e) { setNewLimit(e.target.value) }} placeholder="Límite"
          className="neu-input w-24 px-3 py-2 text-sm" />
        <button onClick={addCard} className="neu-btn-primary px-4 py-2 text-sm">+ Agregar tarjeta</button>
      </div>
    </div>
  )
}