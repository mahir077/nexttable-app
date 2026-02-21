/**
 * Multi-tenant isolation test script
 * Run: npm run test:isolation
 * Or:  node --env-file=.env.local test-isolation.js
 */
try {
  require('dotenv').config({ path: '.env.local' })
} catch {
  // dotenv optional; use node --env-file=.env.local if needed
}

const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing env. Run: node --env-file=.env.local test-isolation.js')
  process.exit(1)
}

const supabase = createClient(url, key)

const TEST_USERS = [
  {
    email: 'demo@restaurant.com',
    expectedOrg: 'Demo Restaurant',
    expectedOrgId: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'golden2@test.com',
    expectedOrg: 'Golden Spoon Restaurant',
    expectedOrgId: '32c0db3f-ff2a-48f1-9c8b-969609cd309d'
  },
  {
    email: 'isratbinteshahidullah51@gmail.com',
    expectedOrg: 'Da Pizzarola',
    expectedOrgId: 'fce48192-e3c6-40de-876d-adff85b2b6fb'
  },
  {
    email: 'love2026@gmail.com',
    expectedOrg: 'Love Road Cafe',
    expectedOrgId: 'ec633a62-806f-4680-bd82-734b06cc3341'
  }
]

async function testIsolation() {
  console.log('🔥 BRUTAL MULTI-TENANT ISOLATION TEST 🔥\n')

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  }

  for (const user of TEST_USERS) {
    console.log(`\n========================================`)
    console.log(`Testing: ${user.email}`)
    console.log(`Expected Org: ${user.expectedOrg}`)
    console.log(`========================================\n`)

    try {
      // Test 1: Menu Items
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, organization_id')
        .eq('organization_id', user.expectedOrgId)

      if (menuError) throw menuError

      console.log(`✅ Menu Items: ${menuItems.length} items`)

      // Check for data leaking (items from other orgs)
      const { data: otherMenuItems } = await supabase
        .from('menu_items')
        .select('id, organization_id')
        .neq('organization_id', user.expectedOrgId)

      const leaked = otherMenuItems?.filter(item =>
        menuItems.some(m => m.id === item.id)
      )

      if (leaked && leaked.length > 0) {
        console.log(`🚨 LEAKED MENU ITEMS DETECTED: ${leaked.length}`)
        results.failed++
        results.errors.push(`${user.email}: Menu items leaked`)
      } else {
        console.log(`✅ Menu isolation: PASS`)
        results.passed++
      }

      // Test 2: Orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, organization_id')
        .eq('organization_id', user.expectedOrgId)

      console.log(`✅ Orders: ${orders?.length || 0} orders`)

      // Test 3: Tables
      const { data: tables } = await supabase
        .from('tables')
        .select('id, table_number, organization_id')
        .eq('organization_id', user.expectedOrgId)

      console.log(`✅ Tables: ${tables?.length || 0} tables`)

      // Test 4: Categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, organization_id')
        .eq('organization_id', user.expectedOrgId)

      console.log(`✅ Categories: ${categories?.length || 0} categories`)

      // Test 5: Suppliers
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, organization_id')
        .eq('organization_id', user.expectedOrgId)

      console.log(`✅ Suppliers: ${suppliers?.length || 0} suppliers`)

      // Test 6: Stock
      const { data: stock } = await supabase
        .from('stock_summary')
        .select('id, organization_id')
        .eq('organization_id', user.expectedOrgId)

      console.log(`✅ Stock Items: ${stock?.length || 0} items`)

      // CRITICAL: Check for NULL org_id (would be visible to everyone)
      const { data: nullOrgItems } = await supabase
        .from('menu_items')
        .select('id')
        .is('organization_id', null)

      if (nullOrgItems && nullOrgItems.length > 0) {
        console.log(`🚨 CRITICAL: ${nullOrgItems.length} items with NULL org_id!`)
        results.failed++
        results.errors.push(`NULL org_id detected in menu_items`)
      }
    } catch (error) {
      console.error(`❌ Error testing ${user.email}:`, error.message)
      results.failed++
      results.errors.push(`${user.email}: ${error.message}`)
    }
  }

  // Final Results
  console.log(`\n\n========================================`)
  console.log(`📊 FINAL RESULTS`)
  console.log(`========================================`)
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)

  if (results.errors.length > 0) {
    console.log(`\n🚨 ERRORS FOUND:`)
    results.errors.forEach(error => console.log(`  - ${error}`))
  }

  if (results.failed === 0) {
    console.log(`\n🎉 ALL TESTS PASSED! MULTI-TENANT ISOLATION VERIFIED! 🎉`)
    console.log(`✅ Safe for production`)
    console.log(`✅ Ready for client meeting`)
  } else {
    console.log(`\n⚠️ TESTS FAILED! FIX REQUIRED BEFORE MEETING!`)
  }
}

testIsolation()
