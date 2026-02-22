# Frontend Tables Loading Verification

## 1. Where tables are queried (dashboard)

### File / component
- **File:** `src/app/dashboard/page.tsx`
- **Component:** `DashboardPage` (default export)

### How `orgId` is obtained
```tsx
// Line 71
const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
```
- First from **AuthContext** (`organization?.id`), then fallback to **localStorage** `current_organization_id`.

---

### Exact queries (API layer)

Tables are not queried directly in the dashboard; they go through **`src/app/lib/api/tables.ts`**.

#### Floors (used to then load tables)
**Function:** `getFloors(organizationId?)`  
**File:** `src/app/lib/api/tables.ts` (lines 23–36)

```ts
export async function getFloors(organizationId?: string | null): Promise<Floor[]> {
  let query = supabase
    .from('floors')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}
```
- **Filters by `organization_id`:** Yes, when `organizationId` is passed (`.eq('organization_id', organizationId)`).

---

#### Tables by floor (main tables list on dashboard)
**Function:** `getTablesByFloor(floorId, organizationId)`  
**File:** `src/app/lib/api/tables.ts` (lines 39–52)

```ts
export async function getTablesByFloor(floorId: string, organizationId: string): Promise<Table[]> {
  const { data, error } = await supabase
    .from('tables')
    .select(`
      *,
      floor:floors(*)
    `)
    .eq('floor_id', floorId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('table_number')

  if (error) throw error
  return data || []
}
```
- **Filters by `organization_id`:** Yes (`.eq('organization_id', organizationId)`).  
- **Also:** `floor_id`, `is_active = true`.

---

#### All tables (merge modal, change table, available count)
**Function:** `getAllTables(organizationId)`  
**File:** `src/app/lib/api/tables.ts` (lines 55–69)

```ts
export async function getAllTables(organizationId: string): Promise<Table[]> {
  const { data, error } = await supabase
    .from('tables')
    .select(`
      *,
      floor:floors(*)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('table_number')

  if (error) throw error
  return data || []
}
```
- **Filters by `organization_id`:** Yes (`.eq('organization_id', organizationId)`).

---

### Where dashboard calls these

| What              | Where in dashboard                    | Call |
|-------------------|----------------------------------------|------|
| Floors            | `useEffect` when `orgId` is set        | `getFloors(orgId)` |
| Tables (by floor) | `useEffect` when `orgId` and `selectedFloor` change | `getTablesByFloor(selectedFloor.id, orgId)` |
| All tables        | Merge modal open, Change table modal, available count | `getAllTables(orgId)` |

**Relevant snippets from `src/app/dashboard/page.tsx`:**

```tsx
// Fetch floors (lines 148–174)
useEffect(() => {
  if (!orgId) {
    setLoading(false)
    return
  }
  const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  async function loadFloors() {
    try {
      const floorsData = await Promise.race([getFloors(orgId), timeout(10000)])
      setFloors(floorsData)
      // ... set selectedFloor, clear tables if no floors
    } catch (error) {
      if (error instanceof Error && error.message !== 'timeout') console.error('Error loading floors:', error)
      setFloors([])
      setSelectedFloor(null)
      setTables([])
      setLoading(false)
    }
  }
  loadFloors()
}, [orgId])

// Fetch tables when floor changes (lines 176–198)
useEffect(() => {
  if (!orgId || !selectedFloor) {
    if (!orgId) setLoading(false)
    return
  }
  const floor = selectedFloor
  const oid = orgId
  const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  async function loadTables() {
    setLoading(true)
    try {
      const tablesData = await Promise.race([getTablesByFloor(floor.id, oid), timeout(10000)])
      setTables(tablesData)
    } catch (error) {
      if (error instanceof Error && error.message !== 'timeout') console.error('Error loading tables:', error)
      setTables([])
    } finally {
      setLoading(false)
    }
  }
  loadTables()
}, [orgId, selectedFloor])
```

So the **exact code that queries tables** for the main grid is: **`getTablesByFloor(floor.id, orgId)`** in that `useEffect`, which runs the Supabase query above (with `organization_id` filter).

---

## 2. AuthContext: organization and localStorage

### Initial state from localStorage
**File:** `src/contexts/AuthContext.tsx`

```tsx
function getInitialOrganizationFromStorage(): Organization | null {
  if (typeof window === 'undefined') return null
  const id = localStorage.getItem('current_organization_id')
  if (!id) return null
  return {
    id,
    name: '',
    slug: '',
    display_name: ''
  }
}

// In AuthProvider:
const [organization, setOrganization] = useState<Organization | null>(getInitialOrganizationFromStorage)
```
- **On mount,** `organization` is set from `current_organization_id` in localStorage (as a stub object with `id`; name/slug/display_name are filled later by `loadOrganizations`).
- So **organization is initialized from localStorage** and is available on first paint when the key exists.

### Provided to children
**File:** `src/contexts/AuthContext.tsx` (lines 434–448)

```tsx
<AuthContext.Provider
  value={{
    user,
    organization,
    organizations,
    loading,
    signIn,
    signUp,
    signOut,
    switchOrganization,
    refreshOrganization
  }}
>
  {children}
</AuthContext.Provider>
```
- **`organization` is in context value**, so any child using `useAuth()` gets `organization` (and thus `organization?.id` for `orgId`).

---

## 3. Error handling and loading

### Query errors
- **Floors:** Caught in `loadFloors`; non-timeout errors logged with `console.error('Error loading floors:', error)`; state reset (floors/tables cleared, loading false).
- **Tables:** Caught in `loadTables`; non-timeout errors logged with `console.error('Error loading tables:', error)`; `setTables([])`; `setLoading(false)` in `finally`.
- **Available count:** Caught; `console.error('Error loading tables count:', error)`.
- **API layer (`tables.ts`):** No try/catch; `if (error) throw error`, so errors propagate to the dashboard’s catch blocks above.

So **query errors are logged** (floors, tables, tables count) and state is cleared or set to empty where appropriate.

### Loading state
- **Dashboard:** `const [loading, setLoading] = useState(true)`.
- **Floors:** If no `orgId`, `setLoading(false)` and return. On success with floors, `setSelectedFloor(floorsData[0])` (next effect then loads tables). On success with no floors, `setLoading(false)`. On error, `setLoading(false)`.
- **Tables:** Before fetch, `setLoading(true)`. In `finally`, `setLoading(false)`. When `!orgId || !selectedFloor`, tables effect doesn’t set loading (floors effect already set it false when no org).
- **UI:** While `loading` is true, the dashboard shows a loading spinner (or loading state) instead of the table grid; after loading finishes, tables (or empty state) are shown.

So **loading state is set and used** so the UI doesn’t show stale data while floors/tables are loading.

---

## Summary

| Question | Answer |
|----------|--------|
| **Where are tables queried?** | `src/app/dashboard/page.tsx` (via `getTablesByFloor` / `getAllTables` from `src/app/lib/api/tables.ts`). |
| **Exact query for main table list?** | Supabase: `from('tables').select('*, floor:floors(*)').eq('floor_id', floorId).eq('organization_id', organizationId).eq('is_active', true).order('table_number')`. |
| **Filter by `organization_id`?** | Yes, in `getFloors` (when orgId passed), `getTablesByFloor`, and `getAllTables`. |
| **Organization from localStorage?** | Yes; initial state uses `getInitialOrganizationFromStorage()` reading `current_organization_id`. |
| **Organization provided to children?** | Yes, via `AuthContext.Provider` value `{ organization, ... }`. |
| **Query errors logged?** | Yes (floors, tables, tables count). |
| **Loading state handled?** | Yes; `loading` is set true/false and used for spinner/empty state. |
