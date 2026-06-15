/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClipboardList } from 'lucide-react'
import { axiosInstance } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { useQuery } from '@tanstack/react-query'
import Spinner from '@/components/Spinner'
import { useQueryState } from 'nuqs'
import Paginator from '@/components/paginator'
import { useState } from 'react'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

const ACTION_FILTERS = ['All', 'CREATE', 'UPDATE', 'DELETE']
const LIMIT = 15

export default function AuditPage() {
  const [action, setAction] = useState('All')
  const [offset, setOffset] = useQueryState('offset', { defaultValue: 0, parse: Number })

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50/50">
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
                </tr>
              ))}
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
