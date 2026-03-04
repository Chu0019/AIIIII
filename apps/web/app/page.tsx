'use client'

import { useEffect, useState } from 'react'

type Airport = {
  icao: string
  iata?: string
  name: string
}

type FlightPlan = {
  id: string
  user_id: string
  dep_icao: string
  arr_icao: string
  route_text?: string
  flight_level?: number
  cycle?: string
  created_at?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function HomePage() {
  const [airports, setAirports] = useState<Airport[]>([])
  const [plans, setPlans] = useState<FlightPlan[]>([])
  const [dep, setDep] = useState('RJTT')
  const [arr, setArr] = useState('RCTP')
  const [routeText, setRouteText] = useState('DCT')
  const [flightLevel, setFlightLevel] = useState(350)
  const [flightPlanId, setFlightPlanId] = useState('')
  const [compute, setCompute] = useState<any>(null)
  const [msg, setMsg] = useState('')

  const loadAirports = async () => {
    const res = await fetch(`${API_BASE}/v1/airports`)
    const data = await res.json()
    setAirports(data || [])
  }

  const loadPlans = async () => {
    const res = await fetch(`${API_BASE}/v1/flight-plans?user_id=demo-user`)
    const data = await res.json()
    setPlans(data || [])
  }

  useEffect(() => {
    loadAirports().catch(() => setAirports([]))
    loadPlans().catch(() => setPlans([]))
  }, [])

  const createPlan = async () => {
    setMsg('建立中...')
    const res = await fetch(`${API_BASE}/v1/flight-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dep_icao: dep, arr_icao: arr, route_text: routeText, flight_level: flightLevel }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMsg(`失敗：${data.detail || 'unknown error'}`)
      return
    }
    setFlightPlanId(data.id)
    setMsg(`已建立航班：${data.id}`)
    await loadPlans()
  }

  const computePlan = async (id?: string) => {
    const targetId = id || flightPlanId
    if (!targetId) return
    const res = await fetch(`${API_BASE}/v1/flight-plans/${targetId}/compute`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setCompute(data)
      setFlightPlanId(targetId)
    }
  }

  const deletePlan = async (id: string) => {
    const res = await fetch(`${API_BASE}/v1/flight-plans/${id}`, { method: 'DELETE' })
    if (res.ok) {
      if (flightPlanId === id) setFlightPlanId('')
      await loadPlans()
    }
  }

  const exportPlan = async (id: string, format: 'json' | 'pln' | 'fms') => {
    const res = await fetch(`${API_BASE}/v1/flight-plans/${id}/export?format=${format}`, { method: 'POST' })
    if (!res.ok) return
    const blob = await res.blob()
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = `flightplan-${id}.${format}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1>AIIIII · Navi Planner</h1>
      <p>第 1 批完成：Flight Plan CRUD / 歷史列表 / 匯出下載</p>

      <section style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
        <h2>建立航班</h2>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          <label>
            出發 ICAO
            <input value={dep} onChange={(e) => setDep(e.target.value.toUpperCase())} style={{ width: '100%' }} />
          </label>
          <label>
            目的 ICAO
            <input value={arr} onChange={(e) => setArr(e.target.value.toUpperCase())} style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            航路
            <input value={routeText} onChange={(e) => setRouteText(e.target.value)} style={{ width: '100%' }} />
          </label>
          <label>
            FL
            <input type="number" value={flightLevel} onChange={(e) => setFlightLevel(Number(e.target.value))} style={{ width: '100%' }} />
          </label>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={createPlan}>建立 Flight Plan</button>
          <button onClick={() => computePlan()} disabled={!flightPlanId}>計算目前航班</button>
        </div>
        <p>{msg}</p>
      </section>

      {compute && (
        <section style={{ marginTop: 16, border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
          <h2>計算結果（{compute.flight_plan_id}）</h2>
          <ul>
            <li>距離：{compute.distance_nm} NM</li>
            <li>ETE：{compute.ete_hr} 小時</li>
            <li>預估燃油：{compute.fuel_estimate_kg} kg</li>
          </ul>
        </section>
      )}

      <section style={{ marginTop: 16, border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
        <h2>Flight Plan 歷史</h2>
        {plans.length === 0 ? (
          <p>目前沒有資料</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">DEP</th>
                <th align="left">ARR</th>
                <th align="left">FL</th>
                <th align="left">操作</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ fontSize: 12 }}>{p.id.slice(0, 8)}...</td>
                  <td>{p.dep_icao}</td>
                  <td>{p.arr_icao}</td>
                  <td>{p.flight_level ?? '-'}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => computePlan(p.id)}>計算</button>
                    <button onClick={() => exportPlan(p.id, 'json')}>JSON</button>
                    <button onClick={() => exportPlan(p.id, 'pln')}>PLN</button>
                    <button onClick={() => exportPlan(p.id, 'fms')}>FMS</button>
                    <button onClick={() => deletePlan(p.id)}>刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>機場清單</h2>
        <ul>
          {airports.map((a) => (
            <li key={a.icao}>{a.icao} / {a.iata} - {a.name}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}
