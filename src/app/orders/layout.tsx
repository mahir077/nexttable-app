import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order History | NextTable'
}

export default function OrdersLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
