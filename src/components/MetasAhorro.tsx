'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Goal, GoalContribution } from '@/lib/types'

export default function MetasAhorro() {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [contributions, setContributions] = useState<GoalContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [abonoInputs, setAbonoInputs] = useState<Record<string, string>>({})
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')

  async function loadAll() {
    setLoading(true)
    const { data: goalData } = await supabase.from('goals').select('*').order('created_at', { ascending: true })
    const { data: contribData } = await supabase.from('goal_contributions').select('*')
    setGoals(goalData ?? [])
    setContributions(contribData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function currentFor(goalId: string) {
    return contributions.filter(c => c.goal_id === goalId).reduce((s, c) => s + Number(c.amount), 0)
  }

  async function addAbono(goalId: string) {
    const amount = Number(abonoInputs[goalId])
    if (!amount || amount <= 0) return
    await supabase.from('goal_contributions').insert({ goal_id: goalId, amount })
    setAbonoInputs(prev => ({ ...prev, [goalId]: '' }))
    loadAll()
  }

  async function addGoal() {
    const target = Number(newTarget)
    if (!newName.trim() || !target || target <= 0) return
    await supabase.from('goals').insert({ name: newName.trim(), target_amount: target })
    setNewName(''); setNewTarget('')
    loadAll()
  }

  async function removeGoal(id: string) {
    await supabase.from('goal_contributions').delete().eq('goal_id', id)
    await supabase.from('goals').delete().eq('id', id)
    loadAll()
  }

  if (loading) return <div className="p-6 text-[var(--neu-text-dim)]">Cargando metas…</div>

  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
  const circumference = 150.8

  return (
    <div className="max-w-xl mt-6 font-mono text-[var(--neu-text)]">
      <h2 className="text-lg mb-4 font-semibold">Metas de ahorro</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {goals.map(g => {
          const current = currentFor(g.id)
          const pct = g.target_amount > 0 ? Math.min(1, current / g.target_amount) : 0
          const offset = circumference * (1 - pct)
          return (
            <div key={g.id} className="neu-raised p-5 relative">
              <button onClick={() => removeGoal(g.id)}
                className="absolute top-3 right-3 text-[var(--neu-text-dim)] hover:text-rose-500 text-sm">×</button>
              <div className="text-sm mb-1">{g.name}</div>
              {g.sub && <div className="text-xs text-[var(--neu-text-dim)] mb-3">{g.sub}</div>}
              <div className="flex items-center gap-4">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--neu-shadow-dark)" strokeWidth="6" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#4FAE7C" strokeWidth="6"
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    transform="rotate(-90 28 28)" />
                </svg>
                <div>
                  <div className="text-lg">{money(current)}</div>
                  <div className="text-xs text-[var(--neu-text-dim)]">meta {money(g.target_amount)} · {Math.round(pct * 100)}%</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  value={abonoInputs[g.id] ?? ''}
                  onChange={e => setAbonoInputs(prev => ({ ...prev, [g.id]: e.target.value }))}
                  placeholder="Abonar $"
                  className="neu-input w-24 px-3 py-2 text-sm"
                />
                <button onClick={() => addAbono(g.id)} className="neu-btn px-4 py-2 text-sm">+ Abonar</button>
              </div>
            </div>
          )
        })}

        <div className="neu-pressed p-5 flex flex-col gap-2 justify-center">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la meta"
            className="neu-input px-3 py-2 text-sm" />
          <input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="Meta $"
            className="neu-input px-3 py-2 text-sm" />
          <button onClick={addGoal} className="neu-btn px-4 py-2 text-sm text-emerald-700">+ Nueva meta</button>
        </div>
      </div>
    </div>
  )
}