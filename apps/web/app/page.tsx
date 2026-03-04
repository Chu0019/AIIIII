async function getAirports() {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
  const res = await fetch(`${base}/v1/airports`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function HomePage() {
  const airports = await getAirports()
  return (
    <main style={{ padding: 24 }}>
      <h1>AIIIII - Navi Planner</h1>
      <p>前後端骨架已建立 ✅</p>
      <h2>Airports API 測試</h2>
      <ul>
        {airports.map((a: any) => (
          <li key={a.icao}>{a.icao} / {a.iata} - {a.name}</li>
        ))}
      </ul>
    </main>
  )
}
