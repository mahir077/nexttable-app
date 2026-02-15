import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reports | NextTable POS'
}

export default function ReportsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
