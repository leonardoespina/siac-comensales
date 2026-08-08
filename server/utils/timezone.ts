export function getVenezuelaDate(): Date {
  const now = new Date()
  const vzlString = now.toLocaleString("en-US", { timeZone: "America/Caracas" })
  return new Date(vzlString)
}

export function isDateBeforeVenezuelaToday(targetDateStr: string): boolean {
  const vzlNow = getVenezuelaDate()
  
  const vzlYear = vzlNow.getFullYear()
  const vzlMonth = String(vzlNow.getMonth() + 1).padStart(2, '0')
  const vzlDay = String(vzlNow.getDate()).padStart(2, '0')
  const vzlTodayStr = `${vzlYear}-${vzlMonth}-${vzlDay}` // Ej: "2026-07-23"

  // Se asume que targetDateStr viene en formato YYYY-MM-DD
  return targetDateStr <= vzlTodayStr
}
