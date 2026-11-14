import { useState } from 'react'
import { X, Mail, Copy, Check, ExternalLink, User } from 'lucide-react'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [copied, setCopied] = useState(false)
  const email = 'sauryah@protonmail.com'

  if (!isOpen) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-mono select-none"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 overflow-hidden shadow-2xl"
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
        <div className="flex items-center space-x-3 mb-5 border-b border-[var(--color-border)] pb-4">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide font-heading">
              Contact Developer
            </h2>
            <p className="text-[10px] text-[var(--color-muted)] font-mono uppercase">
              TMS • Technical Inquiries
            </p>
          </div>
        </div>

        {/* Developer Card */}
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] mb-5">
          <div className="flex items-center space-x-2 text-[var(--color-text)] font-bold text-xs uppercase mb-1">
            <User className="h-3.5 w-3.5 text-blue-400" />
            <span>Sahil Pradhan</span>
          </div>
          <p className="text-[10px] text-[var(--color-muted)] font-mono mb-3">
            Lead Developer & System Architect
          </p>

          <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1.5">
            Email Address
          </label>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] font-mono text-xs">
            <span className="text-[var(--color-text)] select-all font-semibold font-mono">
              {email}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] text-[10px] font-bold uppercase transition-colors cursor-pointer border border-[var(--color-border)]"
              aria-label="Copy email address"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-[var(--color-muted)]" />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2">
          <a
            href={`mailto:${email}`}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)] text-[var(--color-text)] text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3 w-3 text-[var(--color-muted)]" />
            <span>Open Email Client</span>
          </a>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
