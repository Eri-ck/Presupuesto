'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useQuincena } from '@/lib/QuincenaContext'
import { currentQuincenaIndex, quincenaFromIndex, toISODateString } from '@/lib/quincena'
import type { Category, Card, Profile, Priority } from '@/lib/types'

const TYPE_TAGS = ['Alimentos', 'Cultura', 'Entretenimiento', 'Escuela', 'Trabajo', 'Comida', 'Salud', 'Transporte', 'Otro']

export default function RegistrarGasto() {
  const supabase = createClient()
  const { viewedIndex, currentIndex } = useQuincena()
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
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

  async function loadOptions() {
    const { data: cats } = await supabase.from('categories').select('*').order('name')
    const { data: cardData } = await supabase.from('cards').select('*').order('name')
    const { data: profileData } = await supabase.from('profiles').select('*').in('role', ['mama', 'papa'])
    setCategories(cats ?? [])
    setCards(cardData ?? [])
    setProfiles(profileData ?? [])
    if (profileData?.[0]) setProfileId(profileData[0].id)
  }

  useEffect(() => { loadOptions() }, [])

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
    const { start } = quincenaFromIndex(currentQuincenaIndex())
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
      quincena_start: toISODateString(start),
    })

    setDesc(''); setAmount(''); setSelectedTags([]); setNeedsInvoice(false)
    setOccurredAt(new Date().toISOString().slice(0, 10))
    setSaving(false)
    window.location.reload()
  }

  return (
    <div className="neu-raised max-w-xl p-6 mt-6 font-mono text-[var(--neu-text)]" style={{ borderLeft: '4px solid #854f0b' }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: '#854f0b' }}>Registrar gasto</h2>

      {viewedIndex !== currentIndex && (
        <div className="neu-pressed text-amber-700 text-sm p-3 mb-4">
          Estás viendo otra quincena. Los gastos que registres aquí se guardan con la fecha de HOY, no en la quincena que estás mirando.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción"
          className="neu-input px-3 py-2 text-sm col-span-2" />
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto"
          className="neu-input px-3 py-2 text-sm" />
        <input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
          className="neu-input px-3 py-2 text-sm" />
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
          className="neu-input px-3 py-2 text-sm">
          <option value="">— categoría —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={profileId} onChange={e => setProfileId(e.target.value)}
          className="neu-input px-3 py-2 text-sm">
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
          className="neu-input px-3 py-2 text-sm">
          <option value="efectivo">Efectivo / débito</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="neu-pressed flex items-center gap-2 text-sm px-3 py-2">
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

      <div className="flex flex-wrap gap-2 mb-4">
        {TYPE_TAGS.map(tag => (
          <button key={tag} onClick={() => toggleTag(tag)}
            className={`text-xs px-3 py-1 rounded-full ${selectedTags.includes(tag) ? 'bg-teal-600 text-white' : 'neu-btn text-[var(--neu-text-dim)]'}`}>
            {tag}
          </button>
        ))}
      </div>

      {error && <div className="text-rose-600 text-sm mb-3">{error}</div>}

      <button onClick={submit} disabled={saving} className="neu-btn-primary px-4 py-2 text-sm font-medium">
        {saving ? 'Guardando…' : '+ Registrar gasto'}
      </button>
    </div>
  )
}