'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useQuincena } from '@/lib/QuincenaContext'
import { quincenaFromIndex, toISODateString } from '@/lib/quincena'
import type { Category, Transaction } from '@/lib/types'

export default function CategoriasHogar() {
  const supabase = createClient()
  const { viewedIndex } = useQuincena()
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [activeType, setActiveType] = useState<'fijo' | 'variable'>('fijo')

  const { start } = quincenaFromIndex(viewedIndex)
  const quincenaStart = toISODateString(start)

  async function loadAll() {
    setLoading(true)
    const { data: cats } = await supabase.from('categories').select('*').order('created_at', { ascending: true })
    const { data: txns } = await supabase.from('transactions').select('*').eq('quincena_start', quincenaStart)
    setCategories(cats ?? [])
    setTransactions(txns ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [viewedIndex])

  function spentFor(catId: string) {
    return transactions.filter(t => t.category_id === catId).reduce((s, t) => s + Number(t.amount), 0)
  }

  async function addCategory() {
    const budget = Number(newBudget) || 0
    if (!newName.trim()) return
    await supabase.from('categories').insert({ name: newName.trim(), type: activeType, budget_current: budget })
    setNewName('')
    setNewBudget('')
    setShowAdd(false)
    loadAll()
  }

  async function removeCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    loadAll()
  }

  async function updateBudget(id: string, value: string) {
    const budget = Math.max(0, Number(value) || 0)
    await supabase.from('categories').update({ budget_current: budget }).eq('id', id)
    loadAll()
  }

  if (loading) {
    return <div className="p-6 text-[var(--neu-text-dim)]">Cargando categorías…</div>
  }

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const list = categories.filter(c => c.type === activeType)
  const overBudget = list.filter(c => spentFor(c.id) > c.budget_current)

  function renderRow(c: Category) {
    const spent = spentFor(c.id)
    const pct = c.budget_current > 0 ? Math.min(100, (spent / c.budget_current) * 100) : 0
    const over = spent > c.budget_current
    const color = over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'
    return (
      <div key={c.id} className="neu-pressed p-4 mb-3">
        <div className="flex justify-between items-center mb-2 text-sm">
          <span>{c.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-[var(--neu-text-dim)]">
              {money(spent)} / <input type="number" defaultValue={c.budget_current}
                onBlur={e => updateBudget(c.id, e.target.value)}
                className="w-16 bg-transparent border-b border-[var(--neu-shadow-dark)] text-right text-[var(--neu-text)] focus:outline-none" />
            </span>
            <button onClick={() => removeCategory(c.id)} className="neu-btn-danger text-xs px-2 py-1">×</button>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-[var(--neu-shadow-dark)]/30">
          <div className={'h-full ' + color} style={{ width: pct + '%' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="neu-raised max-w-xl p-6 mt-6 font-mono text-[var(--neu-text)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: '#0f6e56' }}>Categorías del hogar</h2>
        <button onClick={() => setShowAdd(v => !v)} className="neu-btn-primary w-7 h-7 flex items-center justify-center text-base">
          {showAdd ? '×' : '+'}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveType('fijo')}
          className={activeType === 'fijo' ? 'neu-btn-primary px-4 py-1.5 text-sm' : 'neu-btn px-4 py-1.5 text-sm text-[var(--neu-text-dim)]'}>
          Fijos
        </button>
        <button onClick={() => setActiveType('variable')}
          className={activeType === 'variable' ? 'neu-btn-primary px-4 py-1.5 text-sm' : 'neu-btn px-4 py-1.5 text-sm text-[var(--neu-text-dim)]'}>
          Variables
        </button>
      </div>

      {overBudget.length > 0 && (
        <div className="neu-pressed text-rose-600 text-sm p-3 mb-4">
          En sobregiro: {overBudget.map(c => c.name).join(', ')}
        </div>
      )}

      {showAdd && (
        <div className="flex gap-2 mb-4">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={'Nueva categoría ' + activeType}
            className="neu-input flex-1 px-3 py-2 text-sm" />
          <input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="Presupuesto"
            className="neu-input w-28 px-3 py-2 text-sm" />
          <button onClick={addCategory} className="neu-btn-primary px-4 py-2 text-sm">Agregar</button>
        </div>
      )}

      {list.length === 0 && (
        <div className="text-[var(--neu-text-dim)] text-sm">Sin categorías {activeType === 'fijo' ? 'fijas' : 'variables'} todavía.</div>
      )}
      {list.map(renderRow)}
    </div>
  )
}