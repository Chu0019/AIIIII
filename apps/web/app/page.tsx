'use client'

import { useEffect, useState } from 'react'

type Airport = { icao: string; iata?: string; name: string }
type FlightPlan = { id: string; dep_icao: string; arr_icao: string; flight_level?: number }
type Weather = { temperature_c?: number; wind_speed_kmh?: number; wind_direction_deg?: number; weather_code?: number }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function HomePage() {
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('demo1234')
  const [airports, setAirports] = useState<Airport[]>([])
  const [plans, setPlans] = useState<FlightPlan[]>([])
  const [dep, setDep] = useState('RJTT')
  const [arr, setArr] = useState('RCTP')
  const [routeText, setRouteText] = useState('DCT')
  const [flightLevel, setFlightLevel] = useState(350)
  const [flightPlanId, setFlightPlanId] = useState('')
  const [compute, setCompute] = useState<any>(null)
  const [depWeather, setDepWeather] = useState<Weather | null>(null)
  const [arrWeather, setArrWeather] = useState<Weather | null>(null)
  const [msg, setMsg] = useState('')

  const authFetch = (url: string, init: RequestInit = {}) => {
    return fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  }

  const login = async () => {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMsg(data.detail || '登入失敗')
      return
    }
    setToken(data.access_token)
    localStorage.setItem('token', data.access_token)
    setMsg('登入成功')
  }

  const signup = async () => {
    const res = await fetch(`${API_BASE}/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: email.split('@')[0] }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMsg(data.detail || '註冊失敗')
      return
    }
    setToken(data.access_token)
    localStorage.setItem('token', data.access_token)
    setMsg('註冊成功')
  }

  const loadAirports = async () => {
    const r = await fetch(`${API_BASE}/v1/airports`)
    setAirports(await r.json())
  }

  const loadPlans = async () => {
    if (!token) return
    const r = await authFetch(`${API_BASE}/v1/flight-plans`)
    if (r.ok) setPlans(await r.json())
  }

  const loadWeather = async (icao: string, setter: (w: Weather | null) => void) => {
    const r = await fetch(`${API_BASE}/v1/weather/${icao}`)
    setter(r.ok ? await r.json() : null)
  }

  useEffect(() => {
    loadAirports().catch(() => {})
    const t = localStorage.getItem('token') || ''
    if (t) setToken(t)
  }, [])

  useEffect(() => {
    if (token) loadPlans().catch(() => {})
  }, [token])

  useEffect(() => {
    loadWeather(dep, setDepWeather).catch(() => setDepWeather(null))
  }, [dep])

  useEffect(() => {
    loadWeather(arr, setArrWeather).catch(() => setArrWeather(null))
  }, [arr])

  const createPlan = async () => {
    const res = await authFetch(`${API_BASE}/v1/flight-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dep_icao: dep, arr_icao: arr, route_text: routeText, flight_level: flightLevel }),
    })
    const data = await res.json()
    if (!res.ok) return setMsg(data.detail || '建立失敗')
    setFlightPlanId(data.id)
    setMsg(`已建立：${data.id}`)
    await loadPlans()
  }

  const computePlan = async (id?: string) => {
    const target = id || flightPlanId
    if (!target) return
    const res = await authFetch(`${API_BASE}/v1/flight-plans/${target}/compute`, { method: 'POST' })
    if (res.ok) setCompute(await res.json())
  }

  const deletePlan = async (id: string) => {
    const res = await authFetch(`${API_BASE}/v1/flight-plans/${id}`, { method: 'DELETE' })
    if (res.ok) loadPlans()
  }

  const exportPlan = async (id: string, format: 'json' | 'pln' | 'fms') => {
    const res = await authFetch(`${API_BASE}/v1/flight-plans/${id}/export?format=${format}`, { method: 'POST' })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flightplan-${id}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1>AIIIII · Navi Planner</h1>
      <p>第 3 批：JWT 登入 + 多使用者資料隔離</p>

      <section style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
        <h2>登入 / 註冊</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />{' '}
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />{' '}
        <button onClick={login}>登入</button>{' '}
        <button onClick={signup}>註冊</button>{' '}
        <button onClick={() => { localStorage.removeItem('token'); setToken(''); setPlans([]) }}>登出</button>
        <p>{token ? '已登入' : '未登入'}｜{msg}</p>
      </section>

      <section style={{ marginTop: 16, border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
        <h2>建立航班</h2>
        <input value={dep} onChange={(e) => setDep(e.target.value.toUpperCase())} /> →{' '}
        <input value={arr} onChange={(e) => setArr(e.target.value.toUpperCase())} />{' '}
        <input value={routeText} onChange={(e) => setRouteText(e.target.value)} placeholder="route" />{' '}
        <input type="number" value={flightLevel} onChange={(e) => setFlightLevel(Number(e.target.value))} style={{ width: 80 }} />{' '}
        <button onClick={createPlan} disabled={!token}>建立</button>{' '}
        <button onClick={() => computePlan()} disabled={!flightPlanId || !token}>計算目前</button>
      </section>

      <section style={{ marginTop: 16, border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
        <h2>即時天氣</h2>
        <div>DEP {dep}: {depWeather?.temperature_c ?? '-'}°C / wind {depWeather?.wind_speed_kmh ?? '-'} km/h</div>
        <div>ARR {arr}: {arrWeather?.temperature_c ?? '-'}°C / wind {arrWeather?.wind_speed_kmh ?? '-'} km/h</div>
      </section>

      {compute && <section style={{ marginTop: 16 }}><h2>計算結果</h2><pre>{JSON.stringify(compute, null, 2)}</pre></section>}

      <section style={{ marginTop: 16, border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
        <h2>Flight Plan 歷史</h2>
        {plans.map((p) => (
          <div key={p.id} style={{ borderTop: '1px solid #eee', padding: '8px 0' }}>
            {p.dep_icao} → {p.arr_icao} FL{p.flight_level ?? '-'} ({p.id.slice(0, 8)}...)
            <div style={{ marginTop: 6 }}>
              <button onClick={() => computePlan(p.id)}>計算</button>{' '}
              <button onClick={() => exportPlan(p.id, 'json')}>JSON</button>{' '}
              <button onClick={() => exportPlan(p.id, 'pln')}>PLN</button>{' '}
              <button onClick={() => exportPlan(p.id, 'fms')}>FMS</button>{' '}
              <button onClick={() => deletePlan(p.id)}>刪除</button>
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>機場清單</h2>
        <ul>{airports.map((a) => <li key={a.icao}>{a.icao} / {a.iata} - {a.name}</li>)}</ul>
      </section>
    </main>
  )
}
