'use client'

import { useEffect, useState } from 'react'

type Airport = {
  icao: string
  iata?: string
  name: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function HomePage() {
  const [airports, setAirports] = useState<Airport[]>([])
  const [dep, setDep] = useState('RJTT')
  const [arr, setArr] = useState('RCTP')
  const [routeText, setRouteText] = useState('DCT')
  const [flightLevel, setFlightLevel] = useState(350)
  const [flightPlanId, setFlightPlanId] = useState('')
  const [compute, setCompute] = useState<any>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/v1/airports`)
      .then((r) => r.json())
      .then(setAirports)
      .catch(() => setAirports([]))
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
  }

  const computePlan = async () => {
    if (!flightPlanId) return
    const res = await fetch(`${API_BASE}/v1/flight-plans/${flightPlanId}/compute`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) setCompute(data)
  }

  return (
    <main style={{ padding: 24, maxWidth: 880, margin: '0 auto' }}>
      <h1>AIIIII · Navi Planner</h1>
      <p>可用 MVP：機場查詢 / 建立 flight plan / 計算距離與燃油估算</p>

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
          <button onClick={computePlan} disabled={!flightPlanId}>計算</button>
        </div>
        <p>{msg}</p>
      </section>

      {compute && (
        <section style={{ marginTop: 16, border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
          <h2>計算結果</h2>
          <ul>
            <li>距離：{compute.distance_nm} NM</li>
            <li>ETE：{compute.ete_hr} 小時</li>
            <li>預估燃油：{compute.fuel_estimate_kg} kg</li>
          </ul>
        </section>
      )}

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
