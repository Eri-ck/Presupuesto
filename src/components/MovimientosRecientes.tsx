'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useQuincena } from '@/lib/QuincenaContext'
import { currentQuincenaIndex, quincenaFromIndex, toISODateString } from '@/lib/quincena'
import type { Transaction, Category, Card as CardType, Profile, Priority } from '@/lib/types'

const TYPE_TAGS = ['Alimentos', 'Cultura', 'Entretenimiento', 'Escuela', 'Trabajo', 'Comida', 'Salud', 'Transporte', 'Otro']

export default function MovimientosRecientes() {
  const supabase = createClient()
  const { viewedIndex, currentIndex } = useQuincena()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [priority, setPriority] = useState<Priority>('necesidad')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [needsInvoice, setNeedsInvoice] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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
    if (!profileId) setProfileId(profileData?.find(p => p.role === 'mama' || p.role === 'papa')?.id ?? '')
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [viewedIndex])

  async function updateCategory(id: string, catId: string) {
    await supabase.from('transactions').update({ category_id: catId }).eq('id', id)
    loadAll()
  }

  async function updatePaymentMethod(id: string, value: string) {
    const isCard = value !== 'efectivo'
    await supabase.from('transactions').update({ payment_method: value, card_id: isCard ? value : null }).eq('id', id)
    loadAll()
  }

  async function toggleInvoice(id: string, current: boolean) {
    await supabase.from('transactions').update({ needs_invoice: !current }).eq('id', id)
    loadAll()
  }

  async function removeTransaction(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setEditingId(null)
    loadAll()
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function submit() {
    const amt = Number(amount)
    if (!desc.trim() || !amt || amt <= 0 || !categoryId || !profileId) {
      setError('Escribe una descripción, un monto mayor a cero, elige categoría y quién gastó.')
      return
    }
    setError('')
    setSaving(true)
    const quincenaHoy = quincenaFromIndex(currentQuincenaIndex())
    const isCard = paymentMethod !== 'efectivo'

    await supabase.from('transactions').insert({
      profile_id: profileId,
      category_id: categoryId,
      amount: amt,
      description: desc.trim(),
      source: 'manual',
      payment_method: paymentMethod,
      card_id: isCard ? paymentMethod : null,
      priority,
      tags: selectedTags,
      needs_invoice: needsInvoice,
      occurred_at: new Date(occurredAt + 'T12:00:00').toISOString(),
      quincena_start: toISODateString(quincenaHoy.start),
    })

    setDesc('')
    setAmount('')
    setSelectedTags([])
    setNeedsInvoice(false)
    setOccurredAt(new Date().toISOString().slice(0, 10))
    setSaving(false)
    setShowAdd(false)
    loadAll()
  }

  if (loading) {
    return <div className="p-6 text-[var(--neu-text-dim)]">Cargando movimientos…</div>
  }

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  function priorityBadgeClass(p: string) {
    if (p === 'necesidad') return 'bg-emerald-100 text-emerald-700'
    return 'bg-amber-100 text-amber-700'
  }

  function priorityLabel(p: string) {
    if (p === 'necesidad') return 'Necesidad'
    return 'Prescindible'
  }

  return (
    <div className="neu-raised max-w-xl p-6 mt-6 font-mono text-[var(--neu-text)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: '#0f6e56' }}>Movimientos recientes</h2>
        <button onClick={() => setShowAdd(v => !v)} className="neu-btn-primary w-7 h-7 flex items-center justify-center text-base">
          {showAdd ? '×' : '+'}
        </button>
      </div>

      {showAdd && (
        <div className="neu-pressed p-4 mb-4">
          {viewedIndex !== currentIndex && (
            <div className="text-amber-700 text-xs mb-3">
              Estás viendo otra quincena, este gasto se guarda con la fecha de HOY.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción"
              className="neu-input px-3 py-2 text-sm col-span-2" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto"
              className="neu-input px-3 py-2 text-sm" />
            <input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
              className="neu-input px-3 py-2 text-sm" />
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="neu-input px-3 py-2 text-sm">
              <option value="">categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={profileId} onChange={e => setProfileId(e.target.value)} className="neu-input px-3 py-2 text-sm">
              {profiles.filter(p => p.role === 'mama' || p.role === 'papa').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="neu-input px-3 py-2 text-sm">
              <option value="efectivo">Efectivo o débito</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm px-1">
              <input type="checkbox" checked={needsInvoice} onChange={e => setNeedsInvoice(e.target.checked)} />
              Necesita factura
            </label>
          </div>
          <div className="flex gap-4 mb-3 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={priority === 'necesidad'} onChange={() => setPriority('necesidad')} />
              Necesidad primaria
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={priority === 'prescindible'} onChange={() => setPriority('prescindible')} />
              Prescindible
            </label>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {TYPE_TAGS.map(tag => {
              const active = selectedTags.includes(tag)
              const cls = active ? 'bg-teal-600 text-white' : 'neu-btn text-[var(--neu-text-dim)]'
              return (
                <button key={tag} onClick={() => toggleTag(tag)} className={'text-xs px-3 py-1 rounded-full ' + cls}>
                  {tag}
                </button>
              )
            })}
          </div>
          {error && <div className="text-rose-600 text-sm mb-3">{error}</div>}
          <button onClick={submit} disabled={saving} className="neu-btn-primary px-4 py-2 text-sm font-medium">
            {saving ? 'Guardando…' : 'Registrar gasto'}
          </button>
        </div>
      )}

      {transactions.length === 0 && (
        <div className="text-[var(--neu-text-dim)] text-sm">Sin movimientos todavía en esta quincena.</div>
      )}

      <div className="flex flex-col">
        {transactions.map(t => {
          const cat = categories.find(c => c.id === t.category_id)
          const card = cards.find(c => c.id === t.card_id)
          const profile = profiles.find(p => p.id === t.profile_id)
          const isEditing = editingId === t.id
          const toggleBtnClass = isEditing ? 'neu-btn-danger' : 'neu-btn-primary'

          return (
            <div key={t.id} className="py-3 border-b border-[var(--neu-shadow-dark)]/30">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-7 h-7 rounded-full neu-pressed flex items-center justify-center text-xs shrink-0">
                  {profile ? profile.name.slice(0, 1) : '?'}
                </span>
                <span className="text-[10px] uppercase text-[var(--neu-text-dim)] neu-pressed rounded px-1.5 py-0.5 shrink-0">
                  {t.source}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {t.description}
                    <span className="text-[var(--neu-text-dim)] text-xs"> {cat ? cat.name : 'Sin categoría'}</span>
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                    <span className="text-[10px] text-[var(--neu-text-dim)]">{fmtDate(t.occurred_at)}</span>
                    {t.priority && (
                      <span className={'text-[10px] px-1.5 py-0.5 rounded-full ' + priorityBadgeClass(t.priority)}>
                        {priorityLabel(t.priority)}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      {card ? card.name : 'Efectivo'}
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
                  className={'text-xs shrink-0 px-3 py-1 rounded-full font-medium ' + toggleBtnClass}>
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
                    <option value="efectivo">Efectivo o débito</option>
                    {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-[var(--neu-text-dim)]">
                    <input type="checkbox" checked={t.needs_invoice} onChange={() => toggleInvoice(t.id, t.needs_invoice)} />
                    Necesita factura
                  </label>
                  <span className="text-[10px] text-[var(--neu-text-dim)]">{fmtTime(t.created_at)}</span>
                  <button onClick={() => removeTransaction(t.id)} className="neu-btn-danger text-xs px-3 py-1 ml-auto">
                    🗑 Borrar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}