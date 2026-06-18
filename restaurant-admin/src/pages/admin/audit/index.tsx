/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClipboardList, ChevronDown } from 'lucide-react'
import { axiosInstance } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { useQuery } from '@tanstack/react-query'
import Spinner from '@/components/Spinner'
import { useQueryState } from 'nuqs'
import Paginator from '@/components/paginator'
import { Fragment, useState } from 'react'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

const ACTION_FILTERS = ['All', 'CREATE', 'UPDATE', 'DELETE']
const LIMIT = 15

function formatLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) {
    if (v.length === 0) return '—'
    return v.map(item => (typeof item === 'object' ? formatValue(item) : String(item))).join(', ')
  }
  if (typeof v === 'object') {
    return Object.entries(v).map(([k, val]) => `${formatLabel(k)}: ${formatValue(val)}`).join(', ')
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

function diffFields(before: Record<string, any> | null, after: Record<string, any> | null) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  const changes: { key: string; before: any; after: any }[] = []
  keys.forEach(key => {
    const b = before?.[key]
    const a = after?.[key]
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changes.push({ key, before: b, after: a })
    }
  })
  return changes
}

function LogDetail({ log }: { log: any }) {
  if (log.action === 'CREATE') {
    const fields = Object.entries(log.after ?? {}).filter(([, v]) => formatValue(v) !== '—')
    if (fields.length === 0) return <p className="text-sm text-gray-400">No details recorded.</p>
    return (
      <ul className="space-y-1.5">
        {fields.map(([key, v]) => (
          <li key={key} className="text-sm">
            <span className="font-medium text-gray-700">{formatLabel(key)}: </span>
            <span className="text-gray-600">{formatValue(v)}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (log.action === 'DELETE') {
    const fields = Object.entries(log.before ?? {}).filter(([, v]) => formatValue(v) !== '—')
    if (fields.length === 0) return <p className="text-sm text-gray-400">No details recorded.</p>
    return (
      <ul className="space-y-1.5">
        {fields.map(([key, v]) => (
          <li key={key} className="text-sm">
            <span className="font-medium text-gray-700">{formatLabel(key)}: </span>
            <span className="text-gray-600">{formatValue(v)}</span>
          </li>
        ))}
      </ul>
    )
  }

  const changes = diffFields(log.before, log.after)
  if (changes.length === 0) return <p className="text-sm text-gray-400">No field changes recorded.</p>
  return (
    <ul className="space-y-2">
      {changes.map(({ key, before, after }) => (
        <li key={key} className="text-sm">
          <span className="font-medium text-gray-700">{formatLabel(key)}: </span>
          <span className="text-red-500 line-through">{formatValue(before)}</span>
          <span className="text-gray-400 mx-1.5">→</span>
          <span className="text-green-600 font-medium">{formatValue(after)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AuditPage() {
  const [action, setAction] = useState('All')
  const [offset, setOffset] = useQueryState('offset', { defaultValue: 0, parse: Number })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', action, offset],
    queryFn: () =>
      axiosInstance
        .get(apiRoutes.audit, {
          params: {
            action: action === 'All' ? undefined : action,
            offset,
            limit: LIMIT,
          },
        })
        .then(r => r.data),
  })

  const logs  = (data as any)?.data ?? []
  const total = (data as any)?.meta?.total ?? 0

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="px-10 md:px-16 lg:px-24 pt-10 pb-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <div className="flex gap-2">
          {ACTION_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setAction(f); setOffset(0) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                action === f
                  ? 'bg-[#F7941D] text-white border-[#F7941D]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#F7941D]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No audit logs yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">By</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => {
                const isExpanded = expandedId === log.id
                return (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="hover:bg-gray-50/50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">{log.entity}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.user?.name ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(log.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={5} className="px-6 py-4">
                          <LogDetail log={log} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {total > LIMIT && (
            <div className="px-6 py-4 border-t border-gray-100">
              <Paginator
                totalItems={total}
                limit={LIMIT}
                offset={offset}
                hasNextPage={offset + LIMIT < total}
                hasPreviousPage={offset > 0}
                onPageChange={setOffset}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
