import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Factory, Plus, Edit2, Trash2, Search, X, Check, Phone, Mail, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { Manufacturer } from '../../types'

export function ManufacturerSettings() {
  const { role } = useAuth()
  const { request } = useApi()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const canManage = role === 'ADMIN' || role === 'ROOT'

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Manufacturer | null>(null)
  const [deletingItem, setDeletingItem] = useState<Manufacturer | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch manufacturers
  const { data: manufacturers = [], isLoading } = useQuery<Manufacturer[]>({
    queryKey: ['manufacturersListSettings'],
    queryFn: () => request('/api/v1/manufacturers/')
  })

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: (payload: Partial<Manufacturer>) => {
      if (editingItem) {
        return request(`/api/v1/manufacturers/${editingItem.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
      }
      return request('/api/v1/manufacturers/', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturersListSettings'] })
      queryClient.invalidateQueries({ queryKey: ['manufacturersDropdownDetail'] })
      queryClient.invalidateQueries({ queryKey: ['manufacturersDropdown'] })
      showToast(editingItem ? 'Manufacturer updated successfully.' : 'Manufacturer registered successfully.', 'success')
      closeModal()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Operation failed'
      setFormError(msg)
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request(`/api/v1/manufacturers/${id}/`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturersListSettings'] })
      queryClient.invalidateQueries({ queryKey: ['manufacturersDropdownDetail'] })
      queryClient.invalidateQueries({ queryKey: ['manufacturersDropdown'] })
      showToast('Manufacturer deleted. Linked dies have been unassigned cleanly.', 'success')
      setDeletingItem(null)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to delete manufacturer'
      showToast(msg, 'error')
    }
  })

  const openCreateModal = () => {
    setEditingItem(null)
    setName('')
    setContactPerson('')
    setEmail('')
    setPhone('')
    setNotes('')
    setFormError(null)
    setShowModal(true)
  }

  const openEditModal = (item: Manufacturer) => {
    setEditingItem(item)
    setName(item.name || '')
    setContactPerson(item.contact_person || '')
    setEmail(item.email || '')
    setPhone(item.phone || '')
    setNotes(item.notes || '')
    setFormError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setFormError('Manufacturer name is required.')
      return
    }

    upsertMutation.mutate({
      name: trimmedName,
      contact_person: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim()
    })
  }

  const filtered = manufacturers.filter((m) => {
    const q = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      (m.contact_person || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.notes || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4 font-mono">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1a1a1a]">
        <div>
          <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] flex items-center gap-2">
            <Factory className="h-4 w-4 text-cyan-400" />
            <span>01 DIE MANUFACTURERS & TOOLING VENDORS</span>
          </h2>
          <span className="text-[#6b7280] text-xs block mt-0.5">
            Manage vendors and tooling machine shops that supply or service your production dies.
          </span>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-sm text-xs uppercase font-mono transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Manufacturer</span>
          </button>
        )}
      </div>

      {/* Search Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search manufacturers by name, contact, email..."
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 pl-8 pr-2.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#e4e4e4]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <span className="text-[10px] text-[#6b7280] uppercase">
          {filtered.length} {filtered.length === 1 ? 'VENDOR' : 'VENDORS'} REGISTERED
        </span>
      </div>

      {/* Table / List */}
      <div className="border border-[#1a1a1a] rounded-sm overflow-hidden bg-[#0a0a0a]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#6b7280]">Loading registered manufacturers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Factory className="h-8 w-8 text-[#404040] mx-auto" />
            <p className="text-xs text-[#888]">No manufacturers found.</p>
            {canManage && (
              <p className="text-[11px] text-[#555]">
                Click <span className="text-blue-400 font-bold">+ Add Manufacturer</span> above to register your first die supplier.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1a1a1a] bg-[#121212] text-[10px] text-[#6b7280] uppercase tracking-wider">
                <th className="p-3">Vendor / Manufacturer</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Notes</th>
                {canManage && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-[#141414]/50 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-[#e4e4e4] flex items-center gap-1.5">
                      <Factory className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span>{m.name}</span>
                    </div>
                  </td>
                  <td className="p-3 space-y-0.5 text-[11px] text-[#888]">
                    {m.contact_person && (
                      <div className="flex items-center gap-1.5 text-[#bbb]">
                        <UserIcon className="h-3 w-3 text-[#555]" />
                        <span>{m.contact_person}</span>
                      </div>
                    )}
                    {m.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-[#555]" />
                        <span>{m.email}</span>
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-[#555]" />
                        <span>{m.phone}</span>
                      </div>
                    )}
                    {!m.contact_person && !m.email && !m.phone && <span>—</span>}
                  </td>
                  <td className="p-3 text-[11px] text-[#6b7280] max-w-xs truncate" title={m.notes || ''}>
                    {m.notes || '—'}
                  </td>
                  {canManage && (
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="p-1 text-[#6b7280] hover:text-blue-400 hover:bg-[#1a1a1a] rounded-sm transition cursor-pointer"
                          title="Edit manufacturer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(m)}
                          className="p-1 text-[#6b7280] hover:text-rose-400 hover:bg-[#1a1a1a] rounded-sm transition cursor-pointer"
                          title="Delete manufacturer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0a0a0a]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm max-w-md w-full p-5 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a1a1a]">
              <h3 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider flex items-center gap-2">
                <Factory className="h-4 w-4 text-cyan-400" />
                <span>{editingItem ? 'Edit Manufacturer' : 'Register New Manufacturer'}</span>
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-[#6b7280] hover:text-[#e4e4e4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">
                  Manufacturer Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Dies Corporation"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sales@vendor.com"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 0199"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">
                  Notes / Technical Specifications
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specializations, casing alloys, delivery terms..."
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:outline-none"
                />
              </div>

              {formError && (
                <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-sm">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a1a1a]">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={upsertMutation.isPending}
                  className="px-3 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#888] rounded-sm uppercase tracking-wider text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upsertMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-sm uppercase tracking-wider text-xs transition disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{upsertMutation.isPending ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Manufacturer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingItem}
        title={`DELETE MANUFACTURER: ${deletingItem?.name}`}
        message={`Are you sure you want to delete "${deletingItem?.name}"? Linked dies will NOT be deleted; their manufacturer reference will simply be cleared to unassigned.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        danger
        onConfirm={() => {
          if (deletingItem) deleteMutation.mutate(deletingItem.id)
        }}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  )
}
