export type FlightPlanComputeResult = {
  flight_plan_id: string
  distance_nm: number
  ete_hr: number
  fuel_estimate_kg: number
}

export type Airport = {
  icao: string
  iata?: string
  name: string
  country?: string
  lat: number
  lon: number
}
