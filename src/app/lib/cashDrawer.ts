const OPEN_CASH_DRAWER_ON_PRINT_KEY = 'openCashDrawerOnPrint'
const CASH_DRAWER_URL_KEY = 'cashDrawerUrl'
const DEFAULT_CASH_DRAWER_URL = 'http://localhost:9100/open'

export function getOpenCashDrawerOnPrint(): boolean {
  if (typeof window === 'undefined') return false
  const v = localStorage.getItem(OPEN_CASH_DRAWER_ON_PRINT_KEY)
  return v === 'true'
}

export function setOpenCashDrawerOnPrint(value: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(OPEN_CASH_DRAWER_ON_PRINT_KEY, value ? 'true' : 'false')
}

export function getCashDrawerUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_CASH_DRAWER_URL
  return localStorage.getItem(CASH_DRAWER_URL_KEY) || DEFAULT_CASH_DRAWER_URL
}

export function setCashDrawerUrl(url: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CASH_DRAWER_URL_KEY, url || DEFAULT_CASH_DRAWER_URL)
}

/** Triggers cash drawer open via local endpoint. Fails silently if no service. */
export async function openCashDrawer(): Promise<void> {
  const url = getCashDrawerUrl()
  if (!url) return
  try {
    await fetch(url, { method: 'POST', mode: 'no-cors' })
  } catch {
    // Local service may not be running; ignore
  }
}
