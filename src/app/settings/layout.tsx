import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings | NextTable'
}

export default function SettingsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
