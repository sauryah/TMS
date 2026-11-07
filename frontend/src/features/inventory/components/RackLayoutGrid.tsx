/**
 * @deprecated Rack storage system has been removed from TMS.
 * Kept as an inert component to prevent breaking any legacy references.
 */
import React from 'react'
import type { Die } from '../../../types'

export interface RackRecord {
  id: number
  name: string
}

export interface RackLayoutGridProps {
  dies?: Die[]
  onMoveDie?: (dieId: string, rackId: number | null, shelf: number | null) => void
  canMove?: boolean
  navigate?: (path: string) => void
}

export function RackLayoutGrid(_props?: RackLayoutGridProps) {
  return null
}
