// Root is redirected by middleware: / -> /dashboard (if logged in) or /login
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-slate-500">Redirecting…</p>
    </div>
  )
}
