import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, breadcrumbs = [], actions }: PageHeaderProps) {
  return (
    <div className="border-b border-[var(--color-border-visible)] pb-5 mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4 page-header">
      <div className="space-y-1">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-muted)] font-mono">
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  {item.href && !isLast ? (
                    <Link 
                      to={item.href} 
                      className="text-[var(--color-accent)] hover:opacity-80 transition-opacity"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-[var(--color-text)]' : ''}>
                      {item.label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronRight className="h-3 w-3 text-[var(--color-muted-dark)] shrink-0" />
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        )}

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-semibold text-[var(--color-text)] leading-tight font-heading">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions slot */}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 md:self-end">
          {actions}
        </div>
      )}
    </div>
  )
}
