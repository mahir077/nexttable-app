'use client'

import Sidebar from '@/components/Sidebar'

export default function ReportsSummaryPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-brand font-black">
                <span className="text-slate-900">Next</span>
                <span className="text-emerald-500">Table</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                SALES & PROFIT REPORTS
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide">
            TODAY / MONTH SUMMARY
          </h2>

          {/* Sales Overview - Daily, Monthly, Yearly */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
              Sales Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Daily Sales
                </div>
                <div className="text-2xl sm:text-3xl font-brand font-black text-emerald-600">
                  ৳12,450
                </div>
                <div className="text-xs text-slate-400 mt-1">Today</div>
              </div>
              <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Monthly Sales
                </div>
                <div className="text-2xl sm:text-3xl font-brand font-black text-blue-600">
                  ৳3,73,500
                </div>
                <div className="text-xs text-slate-400 mt-1">This month</div>
              </div>
              <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Yearly Sales
                </div>
                <div className="text-2xl sm:text-3xl font-brand font-black text-slate-900">
                  ৳44,82,000
                </div>
                <div className="text-xs text-slate-400 mt-1">This year</div>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Item-wise, category-wise, payment & discount reports are available from the sidebar.
          </p>
        </div>
      </div>
    </div>
  )
}
