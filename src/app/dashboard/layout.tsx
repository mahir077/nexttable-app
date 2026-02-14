import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | NextTable POS'
}

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
