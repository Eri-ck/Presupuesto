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
  const [msiDate, setMsiDate] = useState(() => new Date().toISOString().slice(0, 10))

  async function loadAll() {
    setLoading(true)
    const { data: cardData } = await supabase.from('cards').select('*').order('created_at', { ascending: true })
    const { data: txnData } = await supabase.from('transactions').select('*').not('card_id', 'is', null)
    const { data: msiData } = await supabase.from('installment_purchases').select('*').order('purchase_date', { ascending: false })
    setCards(cardData ?? [])
    setTransactions(txnData ?? [])
    setInstallments(msiData ?? [])
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

  async function addInstallment(cardId: string) {
    const total = Number(msiTotal)
    const months = Math.max(1, Number(msiMonths) || 1)
    if (!msiDesc.trim() || !total || total <= 0) return
    await supabase.from('installment_purchases').insert({
      card_id: cardId,
      description: msiDesc.trim(),
      total_amount: total,
      months,
      purchase_date: msiDate,
    })
    setMsiDesc(''); setMsiTotal(''); setMsiMonths('3')
    setMsiDate(new Date().toISOString().slice(0, 10))
    setShowMsi(null)
    loadAll()
  }

  async function removeInstallment(id: string) {
    await supabase.from('installment_purchases').delete().eq('id', id)
    loadAll()
  }

  if (loading) {
    return <div className="p-6 text-[var(--neu-text-dim)]">Cargando tarjetas…</div>
  }

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const fmtDate = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

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
    return { current, finished, monthlyAmount }
  }

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
      <h2 className="text-lg font-semibold mb-4" style={{ color: '#534ab7' }}>Tarjetas de crédito</h2>

      {cards.map(card => {
        const nextCutoff = nextOccurrenceOfDay(card.cutoff_day)
        const nextDue = nextOccurrenceOfDay(card.due_day)
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const daysUntilCutoff = daysBetween(today, nextCutoff)
        const daysUntilDue = daysBetween(today, nextDue)

        const cardInstallments = installments.filter(p => p.card_id === card.id)
        const activeInstallments = cardInstallments.filter(p => !installmentInfo(p).finished)
        const installmentMonthlyTotal = activeInstallments.reduce((s, p) => s + installmentInfo(p).monthlyAmount, 0)

        const spentTxns = transactions.filter(t => t.card_id === card.id).reduce((s, t) => s + Number(t.amount), 0)
        const spent = spentTxns + installmentMonthlyTotal
        const pct = card.credit_limit ? Math.min(100, (spent / card.credit_limit) * 100) : 0
        const isActive = card.id === recommendedId

        return (
          <div key={card.id} className={'neu-pressed p-4 mb-3 ' + (isActive ? 'ring-2 ring-emerald-400' : '')}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">{card.name}</span>
              <button onClick={() => removeCard(card.id)} className="neu-btn-danger text-xs px-2 py-1">Eliminar</button>
            </div>
            {isActive && <span className="inline-block bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full mb-2">Úsala ahora, cortó hace {metrics.find(m => m.card.id === card.id)!.daysSinceCutoff}d</span>}
            {daysUntilCutoff <= 3 && <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full mb-2 ml-1">Corte en {daysUntilCutoff}d</span>}
            <div className="text-xs text-[var(--neu-text-dim)] mb-1">Gastado este corte (incluye MSI del mes)</div>
            <div className="text-xl mb-2">{money(spent)}{card.credit_limit ? <span className="text-sm text-[var(--neu-text-dim)]"> / {money(card.credit_limit)}</span> : null}</div>
            {card.credit_limit