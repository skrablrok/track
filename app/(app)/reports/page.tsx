'use client'

import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Package, Users, AlertTriangle, Download, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format } from 'date-fns'

const COLORS = ['#2563eb', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444']

export default function ReportsPage() {
  const [overview, setOverview] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [audit, setAudit] = useState<any[]>([])
  const [tab, setTab] = useState<'overview' | 'usage' | 'inventory' | 'audit'>('overview')
  const [loading, setLoading] = useState(true)
  const [exportMonth, setExportMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadData() }, [tab])

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`/api/reports/export?month=${exportMonth}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ToolTrack_Report_${exportMonth}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setExporting(false)
  }

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=${tab}`)
      const data = await res.json()
      if (tab === 'overview') setOverview(data)
      else if (tab === 'usage') setUsage(data)
      else if (tab === 'inventory') setInventory(data)
      else if (tab === 'audit') setAudit(data)
    } catch {}
    setLoading(false)
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'usage', label: 'Usage', icon: TrendingUp },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'audit', label: 'Audit Log', icon: Users },
  ] as const

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analytics and usage statistics</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Download size={15} />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-40" />
          ))}
        </div>
      ) : (
        <>
          {tab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Tools', value: overview.totalTools, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Active Checkouts', value: overview.activeCheckouts, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Total Transactions', value: overview.totalCheckouts, color: 'text-purple-600 bg-purple-50' },
                  { label: 'Low Stock Alerts', value: overview.lowStockTools?.length || 0, color: 'text-red-600 bg-red-50' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {overview.lowStockTools?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Low Stock Tools
                  </h2>
                  <div className="space-y-2">
                    {overview.lowStockTools.map((tool: any) => {
                      const pct = Math.round((tool.currentStock / (tool.totalStock || 1)) * 100) || 0
                      return (
                        <div key={tool.id} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-40 truncate">{tool.name}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${pct === 0 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-20 text-right">
                            {tool.currentStock}/{tool.minStock} min
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'usage' && usage && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Most Used Tools</h2>
                  {usage.byTool?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={usage.byTool.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }}
                        />
                        <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-gray-400 text-center py-8">No data yet</p>}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Checkouts by Project</h2>
                  {usage.byProject?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={usage.byProject} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                          {usage.byProject.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-gray-400 text-center py-8">No data yet</p>}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-semibold text-gray-800 mb-4">Top Users</h2>
                <div className="space-y-2">
                  {usage.byUser?.slice(0, 10).map((u: any, i: number) => (
                    <div key={u.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                      <span className="text-sm text-gray-700 flex-1">{u.name}</span>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {u.count} checkouts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'inventory' && inventory.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Tool</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Category</th>
                      <th className="text-center px-5 py-3 font-medium text-gray-600">In Stock</th>
                      <th className="text-center px-5 py-3 font-medium text-gray-600">Total</th>
                      <th className="text-center px-5 py-3 font-medium text-gray-600">Min</th>
                      <th className="text-center px-5 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((tool) => {
                      const isLow = tool.currentStock <= tool.minStock
                      return (
                        <tr key={tool.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-5 py-3 font-medium text-gray-900">{tool.name}</td>
                          <td className="px-5 py-3 text-gray-500">{tool.category || '—'}</td>
                          <td className="px-5 py-3 text-center">{tool.currentStock}</td>
                          <td className="px-5 py-3 text-center">{tool.totalStock}</td>
                          <td className="px-5 py-3 text-center">{tool.minStock}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              tool.currentStock === 0 ? 'bg-red-100 text-red-700' :
                              isLow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {tool.currentStock === 0 ? 'Empty' : isLow ? 'Low' : 'OK'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'audit' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Time</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">User</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Action</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((log) => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                        </td>
                        <td className="px-5 py-3 text-gray-700">{log.user?.name || 'System'}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            log.action === 'CHECKOUT' ? 'bg-amber-100 text-amber-700' :
                            log.action === 'RETURN' ? 'bg-green-100 text-green-700' :
                            log.action === 'LOGIN' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
