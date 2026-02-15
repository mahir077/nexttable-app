'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/api/orders'

function playBuzzerSound(audioContext?: AudioContext | null) {
  try {
    const ctx = audioContext ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const t0 = ctx.currentTime
    ;[0, 0.35, 0.7].forEach(offset => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.25, t0 + offset)
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + offset + 0.25)
      osc.start(t0 + offset)
      osc.stop(t0 + offset + 0.25)
    })
  } catch {
    // No sound if AudioContext not allowed
  }
}

type BuzzerStatus = 'pending' | 'ready' | 'called' | 'returned'

interface BuzzerOrder {
  id: string
  order_number: string
  buzzer_number: number
  buzzer_status: BuzzerStatus | null
  status: string
  created_at: string
}

const STATUS_ORDER: BuzzerStatus[] = ['pending', 'ready', 'called', 'returned']
const STATUS_LABELS: Record<BuzzerStatus, string> = {
  pending: 'Pending',
  ready: 'Ready',
  called: 'Called',
  returned: 'Returned'
}
const STATUS_COLORS: Record<BuzzerStatus, string> = {
  pending: 'bg-orange-500',
  ready: 'bg-emerald-500',
  called: 'bg-blue-500 animate-pulse',
  returned: 'bg-slate-500'
}

export default function BuzzerPage() {
  const [orders, setOrders] = useState<BuzzerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const playedCalledRef = useRef<Set<string>>(new Set())
  const audioContextRef = useRef<AudioContext | null>(null)

  const fetchBuzzerOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, buzzer_number, buzzer_status, status, created_at')
        .not('buzzer_number', 'is', null)
        .order('buzzer_status')
        .order('buzzer_number')
      if (error) throw error
      setOrders((data as BuzzerOrder[]) || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBuzzerOrders()
    const interval = setInterval(fetchBuzzerOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  const enableSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    audioContextRef.current.resume().then(() => {
      setSoundEnabled(true)
      playBuzzerSound(audioContextRef.current)
    })
  }

  // Play sound when a buzzer first appears as "called" (only if sound enabled)
  useEffect(() => {
    if (!soundEnabled) return
    const called = orders.filter(o => (o.buzzer_status || '') === 'called')
    called.forEach(order => {
      if (!playedCalledRef.current.has(order.id)) {
        playedCalledRef.current.add(order.id)
        playBuzzerSound(audioContextRef.current)
      }
    })
  }, [orders, soundEnabled])

  const markReturned = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ buzzer_status: 'returned', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (!error) fetchBuzzerOrders()
  }

  const byStatus = (status: BuzzerStatus) =>
    orders.filter(o => (o.buzzer_status || 'pending') === status)

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm font-medium mb-2 inline-block">← Dashboard</Link>
          <h1 className="text-4xl font-brand font-black mb-1">🔔 Buzzer Queue</h1>
          <p className="text-slate-400">Auto-refreshes every 5s</p>
        </div>
        <button
          type="button"
          onClick={enableSound}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${soundEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'}`}
        >
          {soundEnabled ? '🔊 Sound on' : '🔇 Enable sound'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {STATUS_ORDER.map(status => {
            const list = byStatus(status)
            return (
              <div key={status} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                <h2 className={`text-sm font-bold uppercase mb-4 px-3 py-1 rounded-lg inline-block ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]} ({list.length})
                </h2>
                <div className="space-y-3">
                  {list.length === 0 ? (
                    <p className="text-slate-500 text-sm">None</p>
                  ) : (
                    list.map(order => (
                      <div
                        key={order.id}
                        className="bg-slate-700 rounded-xl p-4 flex items-center justify-between gap-3"
                      >
                        <div className="text-3xl font-black text-white">
                          #{order.buzzer_number}
                        </div>
                        <div className="text-right min-w-0">
                          <div className="text-xs text-slate-400 truncate">{order.order_number}</div>
                          {status !== 'returned' && (
                            <button
                              type="button"
                              onClick={() => markReturned(order.id)}
                              className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                            >
                              Mark Returned
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
