import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Menu Management | NextTable'
}

export default function MenuLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
