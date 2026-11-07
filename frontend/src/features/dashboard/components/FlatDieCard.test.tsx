import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlatDieCard } from './FlatDieCard'
import { describe, test, expect, vi } from 'vitest'

describe('FlatDieCard', () => {
  const mockDie = {
    die_id: 'F-201',
    status: 'RUNNING',
    current_width: '5.500',
    current_thickness: '15.000',
    radius: '1.250',
    casing: '30x15',
    set_name: 'Set Beta',
    machine_name: 'Machine Two'
  }

  test('renders width×thickness, die_id, casing, set, machine, status', () => {
    const handleClick = vi.fn()
    render(<FlatDieCard die={mockDie as any} onClick={handleClick} />)

    // Check die_id and status
    expect(screen.getByText('F-201')).toBeInTheDocument()
    expect(screen.getByText('RUNNING')).toBeInTheDocument()

    // Check width×thickness, casing
    expect(screen.getByText('5.500 × 15.000 mm (R: 1.250 mm)')).toBeInTheDocument()
    expect(screen.getByText('30x15')).toBeInTheDocument()

    // Check set and machine
    expect(screen.getByText('Set Beta')).toBeInTheDocument()
    expect(screen.getByText('Machine Two')).toBeInTheDocument()

    // Test click interaction
    fireEvent.click(screen.getByText('F-201'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
