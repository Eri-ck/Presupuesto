'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { currentQuincenaIndex, quincenaFromIndex, toISODateString } from '@/lib/quincena'
import type { Category, Transaction } from '@/lib/types'

export default function CategoriasHogar() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [newType, setNewType] = useState<'fijo' | 'variable'>('fijo')

  const idx = currentQuincenaIndex()
  const { start } = quincenaFromIndex(idx)
  const quincenaStart = toISODateString(start)

  async function loadAll() {
    setLoading(true)
    const { data: cats } = await supabase.from('categories').select('*').order('created_at', { ascending: true })
    const { data: txns } = await supabase.from('transactions').select('*').eq('quincena_start', quincenaStart)
    setCategories(cats ?? [])
    setTransactions(txns ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function spentFor(catId: string) {
    return transactions.filter(t => t.category_id === catId).reduce((s, t) => s + Number(t.amount), 0)
  }

  async function addCategory() {
    const budget = Number(newBudget) || 0
    if (!newName.trim()) return
    await supabase.from('categories').insert({ name: newName.trim(), type: newType, budget_current: budget })
    setNewName('')
    setNewBudget('')
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

  if (loading) return <div className="p-6 text-neutral-400 font-mono">Cargando categorías…</div>

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const fijas = categories.filter(c => c.type === 'fijo')
  const variables = categories.filter(c => c.type === 'variable')
  const overBudget = categories.filter(c => spentFor(c.id) > c.budget_current)

  function renderRow(c: Category) {
    const spent = spentFor(c.id)
    const pct = c.budget_current > 0 ? Math.min(100, (spent / c.budget_current) * 100) : 0
    const over = spent > c.budget_current
    const color = over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'
    return (
      <div key={c.id} className={`border rounded-lg p-3 mb-2 ${over ? 'border-rose-800' : 'border-neutral-800'} bg-neutral-900`}>
        <div className="flex justify-between items-center mb-2 text-sm">
          <span>{c.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">
              {money(spent)} / <input
                type="number"
                defaultValue={c.budget_current}
                onBlur={e => updateBudget(c.id, e.target.value)}
                className="w-16 bg-transparent border-b border-neutral-700 text-right text-neutral-200"
              />
            </span>
            <button onClick={() => removeCategory(c.id)} className="text-neutral-500 hover:text-rose-400 px-1">×</button>
          </div>
        </div>
        <div className="h-1.5 bg-neutral-800 rounded overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 mt-6 font-mono text-neutral-100">
      <h2 className="text-lg mb-4">Categorías del hogar</h2>

      {overBudget.length > 0 && (
        <div className="bg-rose-950 border border-rose-800 text-rose-200 text-sm rounded-lg p-3 mb-4">
          En sobregiro: {overBudget.map(c => c.name).join(', ')}
        </div>
      )}

      <div className="text-xs uppercase text-neutral-500 mb-2">Gastos fijos</div>
      {fijas.map(renderRow)}
      <div className="flex gap-2 mb-6">
        <input value={newType === 'fijo' ? newName : ''} onChange={e => { setNewType('fijo'); setNewName(e.target.value) }}
          placeholder="Nueva categoría fija" className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <input type="number" value={newType === 'fijo' ? newBudget : ''} onChange={e => { setNewType('fijo'); setNewBudget(e.target.value) }}
          placeholder="Presupuesto" className="w-28 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <button onClick={() => { setNewType('fijo'); addCategory() }} className="bg-emerald-800 text-emerald-200 px-3 py-1 rounded text-sm">+</button>
      </div>

      <div className="text-xs uppercase text-neutral-500 mb-2">Gastos variables</div>
      {variables.map(renderRow)}
      <div className="flex gap-2">
        <input value={newType === 'variable' ? newName : ''} onChange={e => { setNewType('variable'); setNewName(e.target.value) }}
          placeholder="Nueva categoría variable" className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <input type="number" value={newType === 'variable' ? newBudget : ''} onChange={e => { setNewType('variable'); setNewBudget(e.target.value) }}
          placeholder="Presupuesto" className="w-28 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm" />
        <button onClick={() => { setNewType('variable'); addCategory() }} className="bg-emerald-800 text-emerald-200 px-3 py-1 rounded text-sm">+</button>
      </div>
    </div>
  )
}
