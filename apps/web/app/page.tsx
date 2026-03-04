'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Airport = { icao: string; iata?: string; name: string; lat?: number; lon?: number }
type FlightPlan = { id: string; dep_icao: string; arr_icao: string; flight_level?: number }
type Weather = { temperature_c?: number; wind_speed_kmh?: number; wind_direction_deg?: number; weather_code?: number }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

function toRad(d: number) { return (d * Math.PI) / 180 }
function toDeg(r: number) { return (r * 180) / Math.PI }

function greatCirclePoints(lat1: number, lon1: number, lat2: number, lon2: number, steps = 64) {
  const φ1 = toRad(lat1)
  const λ1 = toRad(lon1)
  const φ2 = toRad(lat2)
  const λ2 = toRad(lon2)

  const sinΔφ = Math.sin((φ2 - φ1) / 2)
  const sinΔλ = Math.sin((λ2 - λ1) / 2)
  const a = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ
  const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  if (!isFinite(δ) || δ === 0) return [[lon1, lat1], [lon2, lat2]]

  const raw: number[][] = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const A = Math.sin((1 - f) * δ) / Math.sin(δ)
    const B = Math.sin(f * δ) / Math.sin(δ)

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
    const z = A * Math.sin(φ1) + B * Math.sin(φ2)

    const φ = Math.atan2(z, Math.sqrt(x * x + y * y))
    const λ = Math.atan2(y, x)
    raw.push([toDeg(λ), toDeg(φ)])
  }

  // anti-meridian 展開：避免 +179 -> -179 被畫成穿越整個歐亞非的直線
  const unwrapped: number[][] = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    let lon = raw[i][0]
    const prev = unwrapped[i - 1][0]
    while (lon - prev > 180) lon -= 360
    while (lon - prev < -180) lon += 360
    unwrapped.push([lon, raw[i][1]])
  }

  return unwrapped
}

function splitForMap(coords: number[][]) {
  if (coords.length < 2) return [coords]

  const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180
  const wrapped = coords.map(([lon, lat]) => [wrapLon(lon), lat])

  const lines: number[][][] = []
  let current: number[][] = [wrapped[0]]

  for (let i = 1; i < wrapped.length; i++) {
    const prev = wrapped[i - 1][0]
    const now = wrapped[i][0]
    if (Math.abs(now - prev) > 180) {
      if (current.length > 1) lines.push(current)
      current = [wrapped[i]]
    } else {
      current.push(wrapped[i])
    }
  }

  if (current.length > 1) lines.push(current)
  return lines.length ? lines : [wrapped]
}

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

  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  const depAirport = useMemo(() => airports.find((a) => a.icao === dep), [airports, dep])
  const arrAirport = useMemo(() => airports.find((a) => a.icao === arr), [airports, arr])

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
    if (!res.ok) return setMsg(data.detail || '登入失敗')
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
    if (!res.ok) return setMsg(data.detail || '註冊失敗')
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
    if (!flightPlanId && plans.length > 0) setFlightPlanId(plans[0].id)
  }, [plans, flightPlanId])

  useEffect(() => { loadWeather(dep, setDepWeather).catch(() => setDepWeather(null)) }, [dep])
  useEffect(() => { loadWeather(arr, setArrWeather).catch(() => setArrWeather(null)) }, [arr])

  useEffect(() => {
    const mount = async () => {
      if (!mapContainerRef.current || !depAirport?.lat || !arrAirport?.lat) return
      const maplibregl = (await import('maplibre-gl')).default

      if (!mapRef.current) {
        mapRef.current = new maplibregl.Map({
          container: mapContainerRef.current,
          style: 'https://demotiles.maplibre.org/style.json',
          center: [depAirport.lon || 0, depAirport.lat || 0],
          zoom: 3,
          renderWorldCopies: false,
        })

        // 盡量使用 globe 投影（若樣式/版本不支援則忽略）
        try {
          mapRef.current.setProjection({ type: 'globe' } as any)
        } catch (_) {}
        try {
          mapRef.current.setFog({})
        } catch (_) {}
      }

      const map = mapRef.current
      const depLat = Number(depAirport.lat)
      const depLon = Number(depAirport.lon)
      const arrLat = Number(arrAirport.lat)
      const arrLon = Number(arrAirport.lon)
      if (![depLat, depLon, arrLat, arrLon].every((n) => Number.isFinite(n))) return

      // 優先使用 route_text 解析後的航點路徑；若無可用航點再 fallback 到大圓弧
      let baseCoords: number[][] = []
      try {
        const rr = await fetch(`${API_BASE}/v1/route/resolve?dep=${dep}&arr=${arr}&route_text=${encodeURIComponent(routeText)}`)
        if (rr.ok) {
          const data = await rr.json()
          baseCoords = (data.points || []).map((p: any) => [Number(p.lon), Number(p.lat)]).filter((c: number[]) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
        }
      } catch (_) {}

      if (baseCoords.length < 2) {
        baseCoords = greatCirclePoints(depLat, depLon, arrLat, arrLon, 96)
      }

      const lineParts = splitForMap(baseCoords)
      const routeGeo = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: lineParts.length > 1 ? 'MultiLineString' : 'LineString',
              coordinates: lineParts.length > 1 ? lineParts : lineParts[0],
            },
            properties: {},
          },
        ],
      } as any

      const pointsGeo = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [depLon, depLat] }, properties: { label: depAirport.icao } },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [arrLon, arrLat] }, properties: { label: arrAirport.icao } },
        ],
      } as any

      const directGeo = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[depLon, depLat], [arrLon, arrLat]] },
            properties: {},
          },
        ],
      } as any

      const renderRoute = () => {
        if (map.getSource('route')) {
          map.getSource('route').setData(routeGeo)
        } else {
          map.addSource('route', { type: 'geojson', data: routeGeo })
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#ff2d55', 'line-width': 5, 'line-opacity': 0.95 },
          })
        }

        if (map.getSource('route-points')) {
          map.getSource('route-points').setData(pointsGeo)
        } else {
          map.addSource('route-points', { type: 'geojson', data: pointsGeo })
          map.addLayer({
            id: 'route-points-circle',
            type: 'circle',
            source: 'route-points',
            paint: { 'circle-radius': 5, 'circle-color': '#111827', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
          })
          map.addLayer({
            id: 'route-points-label',
            type: 'symbol',
            source: 'route-points',
            layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-offset': [0, 1.2] },
            paint: { 'text-color': '#111827', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
          })
        }

        // 除了大圓弧，也加一條直接線當可視化保底
        if (map.getSource('route-direct')) {
          map.getSource('route-direct').setData(directGeo)
        } else {
          map.addSource('route-direct', { type: 'geojson', data: directGeo })
          map.addLayer({
            id: 'route-direct-line',
            type: 'line',
            source: 'route-direct',
            paint: { 'line-color': '#f59e0b', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.9 },
          })
        }

        const lonA = depLon
        const lonB = arrLon
        const crossesDateLine = Math.abs(lonA - lonB) > 180

        if (crossesDateLine) {
          map.easeTo({
            center: [180, (depAirport.lat! + arrAirport.lat!) / 2],
            zoom: 2,
            duration: 500,
          })
        } else {
          const bounds = new maplibregl.LngLatBounds()
          bounds.extend([lonA, depAirport.lat!])
          bounds.extend([lonB, arrAirport.lat!])
          map.fitBounds(bounds, { padding: 40, duration: 500 })
        }
      }

      if (map.isStyleLoaded()) renderRoute()
      else map.once('load', renderRoute)
    }

    mount().catch(() => {})
  }, [depAirport, arrAirport])

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
    <main style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
      <h1>AIIIII · Navi Planner</h1>
      <p>第 5 批：Route Text 解析 + 航點折線地圖</p>

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
        <h2>航線地圖</h2>
        <div ref={mapContainerRef} style={{ width: '100%', height: 360, borderRadius: 8, overflow: 'hidden' }} />
        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{dep} → {arr}</div>
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

      {compute && (
        <section style={{ marginTop: 16, border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
          <h2>計算結果</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 12 }}>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ fontSize: 12, color: '#666' }}>距離</div><div style={{ fontSize: 24, fontWeight: 700 }}>{compute.distance_nm} NM</div></div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ fontSize: 12, color: '#666' }}>ETE</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.floor((compute.ete_hr || 0) * 60 / 60)}h {(Math.round((compute.ete_hr || 0) * 60) % 60).toString().padStart(2, '0')}m</div></div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ fontSize: 12, color: '#666' }}>預估燃油</div><div style={{ fontSize: 24, fontWeight: 700 }}>{compute.fuel_estimate_kg} kg</div></div>
          </div>
        </section>
      )}

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
    </main>
  )
}
