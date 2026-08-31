'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useQuincena } from '@/lib/QuincenaContext'
import { quincenaFromIndex, toISODateString } from '@/lib/quincena'
import type { Transaction, Category, Card as CardType, Profile } from '@/lib/types'

export default function MovimientosRecientes() {
  const supabase = createClient()
  const { viewedIndex } = useQuincena()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { start } = quincenaFromIndex(viewedIndex)
  const quincenaStart = toISODateString(start)

  async function loadAll() {
    setLoading(true)
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

  useEffect(() => { loadAll() }, [viewedIndex])

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

  if (loading) return <div className="p-6 text-[var(--neu-text-dim)]">Cargando movimientos…</div>

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="neu-raised max-w-xl p-6 mt-6 font-mono text-[var(--neu-text)]" style={{ borderLeft: '4px solid #0f6e56' }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: '#0f6e56' }}>Movimientos recientes</h2>
      {transactions.length === 0 && (
        <div className="text-[var(--neu-text-dim)] text-sm">Sin movimientos todavía en esta quincena.</div>
      )}
      <div className="flex flex-col">
        {transactions.map(t => {
          const cat = categories.find(c => c.id === t.category_id)
          const card = cards.find(c => c.id === t.card_id)
          const profile = profiles.find(p => p.id === t.profile_id)
          const isEditing = editingId === t.id
          return (
            <div key={t.id} className="py-3 border-b border-[var(--neu-shadow-dark)]/30">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-7 h-7 rounded-full neu-pressed flex items-center justify-center text-xs shrink-0">
                  {profile?.name?.[0] ?? '?'}
                </span>
                <span className="text-[10px] uppercase text-[var(--neu-text-dim)] neu-pressed rounded px-1.5 py-0.5 shrink-0">
                  {t.source}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {t.description} <span className="text-[var(--neu-text-dim)] text-xs">{cat?.name ?? 'Sin categoría'}</span>
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                    <span className="text-[10px] text-[var(--neu-text-dim)]">{fmtDate(t.occurred_at)}</span>
                    {t.priority && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.priority === 'necesidad' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t.priority === 'necesidad' ? 'Necesidad' : 'Prescindible'}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      {card?.name ?? 'Efectivo'}
                    </span>
                    {t.needs_invoice && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Facturar</span>
                    )}
                    {(t.tags ?? []).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full neu-pressed text-[var(--neu-text-dim)]">{tag}</span>
                    ))}
                  </div>
                </div>
                <span className="text-sm shrink-0">{money(t.amount)}</span>
                <button onClick={() => setEditingId(isEditing ? null : t.id)}
                  className={`text-xs shrink-0 px-3 py-1 rounded-full font-medium ${isEditing ? 'neu-btn-danger' : 'neu-btn-primary'}`}>
                  {isEditing ? 'Cerrar' : 'Editar'}
                </button>
              </div>

              {isEditing && (
                <div className="mt-3 ml-10 flex flex-wrap gap-2 items-center neu-pressed p-3">
                  <select value={t.category_id ?? ''} onChange={e => updateCategory(t.id, e.target.value)}
                    className="bg-transparent border-b border-[var(--neu-shadow-dark)] px-1 py-1 text-xs focus:outline-none">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={t.card_id ?? 'efectivo'} onChange={e => updatePaymentMethod(t.id, e.target.value)}
                    className="bg-transparent border-b border-[var(--neu-shadow-dark)] px-1 py-1 text-xs focus:outline-none">
                    <option value="efectivo">Efectivo / débito</option>
                    {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-[var(--neu-text-dim)]">
                    <input type="checkbox" checked={t.needs_invoice} onChange={() => toggleInvoice(t.id, t.needs_invoice)} />
                    Necesita factura
                  </label>
                  <span className="text-[10px] text-[var(--neu-text-dim)]">{fmtTime(t.created_at)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}