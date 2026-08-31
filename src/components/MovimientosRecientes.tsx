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
  const [editingId, setEditingId] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    const { start } = quincenaFromIndex(currentQuincenaIndex())
    const quincenaStart = toISODateString(start)

    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('quincena_start', quincenaStart)
      .order('created_at', { ascending: false })
    const { data: cats } = await supabase.from('categories').select('*').order('name')
    const { data: cardData } = await supabase.from('cards').select('*').order('name')
    const { data: profileData } = await supabase.from('profiles').select('*')

    setTransactions(txns ?? [])
    setCategories(cats ?? [])
    setCards(cardData ?? [])
    setProfiles(profileData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function updateCategory(id: string, categoryId: string) {
    await supabase.from('transactions').update({ category_id: categoryId }).eq('id', id)
    loadAll()
  }

  async function updatePaymentMethod(id: string, value: string) {
    const isCard = value !== 'efectivo'
    await supabase.from('transactions').update({
      payment_method: value,
      card_id: isCard ? value : null,
    }).eq('id', id)
    loadAll()
  }

  async function toggleInvoice(id: string, current: boolean) {
    await supabase.from('transactions').update({ needs_invoice: !current }).eq('id', id)
    loadAll()
  }

  if (loading) return <div className="p-6 text-neutral-400 font-mono">Cargando movimientos…</div>

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
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
          const isEditing = editingId === t.id
          return (
            <div key={t.id} className="py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
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
                  <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                    <span className="text-[10px] text-neutral-500">{fmtDate(t.occurred_at)}</span>
                    {t.priority && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.priority === 'necesidad' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'}`}>
                        {t.priority === 'necesidad' ? 'Necesidad' : 'Prescindible'}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-purple-700 text-purple-300">
                      {card?.name ?? 'Efectivo'}
                    </span>
                    {t.needs_invoice && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900 text-blue-300">Facturar</span>
                    )}
                    {(t.tags ?? []).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700 text-neutral-400">{tag}</span>
                    ))}
                  </div>
                </div>
                <span className="text-sm shrink-0">{money(t.amount)}</span>
                <button onClick={() => setEditingId(isEditing ? null : t.id)}
                  className="text-neutral-500 hover:text-teal-400 text-xs shrink-0 border border-neutral-700 rounded px-2 py-1">
                  {isEditing ? 'Cerrar' : 'Editar'}
                </button>
              </div>

              {isEditing && (
                <div className="mt-3 ml-10 flex flex-wrap gap-2 items-center bg-neutral-900 border border-neutral-800 rounded p-3">
                  <select value={t.category_id ?? ''} onChange={e => updateCategory(t.id, e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={t.card_id ?? 'efectivo'} onChange={e => updatePaymentMethod(t.id, e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs">
                    <option value="efectivo">Efectivo / débito</option>
                    {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-neutral-400">
                    <input type="checkbox" checked={t.needs_invoice} onChange={() => toggleInvoice(t.id, t.needs_invoice)} />
                    Necesita factura
                  </label>
                  <span className="text-[10px] text-neutral-600">{fmtTime(t.created_at)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}