import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billing Hub | NextTable'
}

export default function BillingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
