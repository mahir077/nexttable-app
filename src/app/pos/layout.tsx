import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'POS System | NextTable'
}

export default function POSLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
