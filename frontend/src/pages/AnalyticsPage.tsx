import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Boxes,
  CircleDot,
  Square,
  Factory,
  RefreshCw,
  ExternalLink,
  Cpu,
  BarChart3,
  HelpCircle
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { Skeleton } from '../components/ui/Skeleton'
import type { AnalyticsSummary } from '../types'

export function AnalyticsPage() {
  const { request } = useApi()

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery<AnalyticsSummary>({
    queryKey: ['analyticsSummary'],
    queryFn: () => request('/api/v1/analytics/summary/'),
    staleTime: 30000,
  })

  const totalDies = data?.total_dies || 0
  const roundDies = data?.round_dies || 0
  const flatDies = data?.flat_dies || 0
  const roundPct = totalDies > 0 ? ((roundDies / totalDies) * 100).toFixed(1) : '0.0'
  const flatPct = totalDies > 0 ? ((flatDies / totalDies) * 100).toFixed(1) : '0.0'

  const diesInSets = data?.sets_summary?.dies_in_sets || 0
  const diesInStorage = data?.sets_summary?.dies_in_storage || 0
  const setsPct = totalDies > 0 ? ((diesInSets / totalDies) * 100).toFixed(1) : '0.0'
  const storagePct = totalDies > 0 ? ((diesInStorage / totalDies) * 100).toFixed(1) : '0.0'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-mono space-y-6">
      {/* Page Header */}
      <div className="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] font-bold uppercase tracking-wider mb-0.5">
            <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
            <span>Fleet Telemetry & Insights</span>
          </div>
          <h1 className="text-base md:text-lg font-bold text-[var(--color-text)] uppercase tracking-wide font-heading">
            Tool Room Analytics
          </h1>
          <p className="text-[var(--color-muted)] text-xs mt-0.5">
            Real-time breakdown of die inventory count, profile types, and manufacturer allocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-1.5 min-h-[32px] inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider transition-colors font-mono border border-[var(--color-border-visible)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-[var(--color-text)] rounded-sm cursor-pointer disabled:opacity-50"
            title="Refresh fleet analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-400' : 'text-[var(--color-muted)]'}`} />
            <span>{isFetching ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-4 rounded-sm h-28 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-5 rounded-sm h-48 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {isError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-sm text-xs space-y-2 font-mono">
          <div className="font-bold uppercase tracking-wider">Failed to load analytics summary</div>
          <p className="text-rose-400/90">{error instanceof Error ? error.message : 'An error occurred while fetching fleet metrics.'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-sm text-xs font-bold uppercase transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && data && (
        <div className="space-y-6">
          {/* Top 4 Primary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Dies */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-4 rounded-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Total Dies</span>
                <div className="p-1.5 rounded-sm bg-blue-500/10 text-blue-400">
                  <Boxes className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--color-text)] tabular-nums tracking-tight">
                  {data.total_dies.toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  Complete registered tool fleet
                </div>
              </div>
              <Link
                to="/inventory"
                className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-bold pt-1 uppercase tracking-wider border-t border-[var(--color-border)]"
              >
                <span>View Inventory</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Round Dies */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-4 rounded-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Round Dies</span>
                <div className="p-1.5 rounded-sm bg-emerald-500/10 text-emerald-400">
                  <CircleDot className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[var(--color-text)] tabular-nums tracking-tight">
                    {data.round_dies.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm border border-emerald-500/20 tabular-nums">
                    {roundPct}%
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  Round wire drawing profiles
                </div>
              </div>
              <Link
                to="/inventory?die_type=ROUND"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-bold pt-1 uppercase tracking-wider border-t border-[var(--color-border)]"
              >
                <span>Filter Round Dies</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Flat Dies */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-4 rounded-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Flat Dies</span>
                <div className="p-1.5 rounded-sm bg-amber-500/10 text-amber-400">
                  <Square className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[var(--color-text)] tabular-nums tracking-tight">
                    {data.flat_dies.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-sm border border-amber-500/20 tabular-nums">
                    {flatPct}%
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  Rectangular strip & ribbon tooling
                </div>
              </div>
              <Link
                to="/inventory?die_type=FLAT"
                className="text-[11px] text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-bold pt-1 uppercase tracking-wider border-t border-[var(--color-border)]"
              >
                <span>Filter Flat Dies</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Machine Sets */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-4 rounded-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Active Sets</span>
                <div className="p-1.5 rounded-sm bg-purple-500/10 text-purple-400">
                  <Cpu className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--color-text)] tabular-nums tracking-tight">
                  {data.total_sets.toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  {data.sets_summary.dies_in_sets.toLocaleString()} dies assigned to sets
                </div>
              </div>
              <Link
                to="/machines"
                className="text-[11px] text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 font-bold pt-1 uppercase tracking-wider border-t border-[var(--color-border)]"
              >
                <span>View Sets</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Profile & Set Summary Progress Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Round vs Flat Profile Split */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-4 rounded-sm space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                  Profile Type Ratio
                </div>
                <span className="text-[11px] text-[var(--color-muted)]">
                  {totalDies.toLocaleString()} Total
                </span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="w-full bg-[var(--color-surface-2)] h-3 rounded-xs overflow-hidden flex border border-[var(--color-border)]">
                <div
                  style={{ width: `${roundPct}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={`Round Dies: ${roundDies.toLocaleString()} (${roundPct}%)`}
                />
                <div
                  style={{ width: `${flatPct}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Flat Dies: ${flatDies.toLocaleString()} (${flatPct}%)`}
                />
              </div>

              {/* Legend & Details */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xs bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div className="text-[11px] text-[var(--color-muted)] uppercase">Round Profile</div>
                    <div className="font-bold text-[var(--color-text)] tabular-nums">
                      {roundDies.toLocaleString()} dies ({roundPct}%)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xs bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <div className="text-[11px] text-[var(--color-muted)] uppercase">Flat Profile</div>
                    <div className="font-bold text-[var(--color-text)] tabular-nums">
                      {flatDies.toLocaleString()} dies ({flatPct}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Set Allocation vs Storage */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] p-4 rounded-sm space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                  Tooling Allocation Status
                </div>
                <span className="text-[11px] text-[var(--color-muted)]">
                  {data.total_sets} Sets Configured
                </span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="w-full bg-[var(--color-surface-2)] h-3 rounded-xs overflow-hidden flex border border-[var(--color-border)]">
                <div
                  style={{ width: `${setsPct}%` }}
                  className="bg-purple-500 transition-all duration-300"
                  title={`In Machine Sets: ${diesInSets.toLocaleString()} (${setsPct}%)`}
                />
                <div
                  style={{ width: `${storagePct}%` }}
                  className="bg-blue-500 transition-all duration-300"
                  title={`In Storage / Unassigned: ${diesInStorage.toLocaleString()} (${storagePct}%)`}
                />
              </div>

              {/* Legend & Details */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xs bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <div>
                    <div className="text-[11px] text-[var(--color-muted)] uppercase">Mounted in Sets</div>
                    <div className="font-bold text-[var(--color-text)] tabular-nums">
                      {diesInSets.toLocaleString()} dies ({setsPct}%)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xs bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <div className="text-[11px] text-[var(--color-muted)] uppercase">Storage / Crib</div>
                    <div className="font-bold text-[var(--color-text)] tabular-nums">
                      {diesInStorage.toLocaleString()} dies ({storagePct}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manufacturer Breakdown Table & Distribution */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] rounded-sm overflow-hidden font-mono">
            <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-blue-400" />
                <h2 className="text-xs md:text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Manufacturer Fleet Breakdown
                </h2>
              </div>
              <span className="text-[11px] text-[var(--color-muted)]">
                {data.manufacturers.length} Registered Categories
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] text-[var(--color-muted)] uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2.5 px-4">Manufacturer</th>
                    <th className="py-2.5 px-4 text-right">Total Dies</th>
                    <th className="py-2.5 px-4 text-right">Round Dies</th>
                    <th className="py-2.5 px-4 text-right">Flat Dies</th>
                    <th className="py-2.5 px-4">Fleet Share</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {data.manufacturers.map(m => {
                    const isUnassigned = m.id === null
                    return (
                      <tr
                        key={m.name}
                        className="hover:bg-[var(--color-surface-2)] transition-colors group"
                      >
                        <td className="py-3 px-4 font-bold text-[var(--color-text)] flex items-center gap-2">
                          {isUnassigned ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-slate-500/10 text-slate-300 border border-slate-500/20 text-[11px]">
                              <HelpCircle className="h-3 w-3 text-slate-400" />
                              <span>Unassigned / None</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <Factory className="h-3.5 w-3.5 text-blue-400/80" />
                              <span>{m.name}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-[var(--color-text)] tabular-nums">
                          {m.total_dies.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right tabular-nums text-emerald-400">
                          {m.round_dies.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right tabular-nums text-amber-400">
                          {m.flat_dies.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 w-48 sm:w-64">
                          <div className="flex items-center gap-3">
                            <div className="flex-grow bg-[var(--color-surface-2)] h-2 rounded-xs overflow-hidden border border-[var(--color-border)]">
                              <div
                                style={{ width: `${m.percentage}%` }}
                                className={`h-full transition-all duration-300 ${isUnassigned ? 'bg-slate-400' : 'bg-blue-500'}`}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-[var(--color-text)] tabular-nums w-12 text-right">
                              {m.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Link
                            to={isUnassigned ? '/inventory' : `/inventory?manufacturer=${encodeURIComponent(m.name)}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                          >
                            <span>Filter</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Table Total Row */}
                  <tr className="bg-[var(--color-surface-2)] font-bold text-xs uppercase border-t-2 border-[var(--color-border-visible)]">
                    <td className="py-3 px-4 text-[var(--color-text)]">
                      Fleet Total
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--color-text)] tabular-nums">
                      {totalDies.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 tabular-nums">
                      {roundDies.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400 tabular-nums">
                      {flatDies.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-[var(--color-text)]">
                      100.0%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to="/inventory"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                      >
                        <span>All</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
