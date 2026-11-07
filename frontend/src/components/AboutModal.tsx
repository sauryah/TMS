import { X, Cpu, Server, ShieldCheck } from 'lucide-react'
import { APP_VERSION } from '../version'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-mono select-none"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-xl w-full p-6 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 border-b border-[var(--color-border)] pb-4">
          <div className="p-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl flex items-center justify-center">
            <img src="/icons/128x128.png" alt="TMS Logo" className="h-8 w-8 rounded-lg object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide font-heading">
              System Information
            </h2>
            <p className="text-[10px] text-[var(--color-muted)] font-bold font-mono uppercase">
              TMS | Tool Management System (v{APP_VERSION})
            </p>
          </div>
        </div>

        {/* Platform Overview */}
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] mb-5">
          <div className="flex items-center space-x-2 text-[var(--color-text)] font-bold text-xs uppercase mb-1">
            <Server className="h-4 w-4 text-blue-400" />
            <span>Dual-Engine Architecture</span>
          </div>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed font-mono">
            High-performance industrial tooling platform splitting write operations (Django transactions, auditing, backups) and real-time read paths (Go search query proxy, SSE live broadcast engine).
          </p>
        </div>

        {/* Architecture Stack */}
        <div className="mb-5">
          <h4 className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-muted)] mb-2.5 flex items-center space-x-1.5">
            <Cpu className="h-3 w-3 text-blue-400" />
            <span>Core Architecture Stack</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[var(--color-muted)] font-mono">
            <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
              <span className="block text-[var(--color-text)] text-[10px] font-bold mb-0.5 uppercase">
                Frontend
              </span>
              React 18 • TypeScript • Vite • Tailwind CSS
            </div>
            <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
              <span className="block text-[var(--color-text)] text-[10px] font-bold mb-0.5 uppercase">
                Backend
              </span>
              Django 4.2 • REST Framework • PostgreSQL 18
            </div>
            <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
              <span className="block text-[var(--color-text)] text-[10px] font-bold mb-0.5 uppercase">
                Search & Events
              </span>
              Go 1.22 • Meilisearch • Redis 7 • SSE
            </div>
          </div>
        </div>

        {/* Security & Runtime Specifications */}
        <div className="border-t border-[var(--color-border)] pt-4 font-mono">
          <h4 className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-muted)] mb-2 flex items-center space-x-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>Security & Runtime Specifications</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-[var(--color-muted)] font-mono">
            <div className="flex items-center space-x-2 p-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg">
              <span className="text-[var(--color-text)] font-semibold uppercase">Process:</span>
              <span>Non-Root (UID 1001 / tmsuser)</span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg">
              <span className="text-[var(--color-text)] font-semibold uppercase">Outbox:</span>
              <span>HMAC-SHA256 Signed Tasks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
