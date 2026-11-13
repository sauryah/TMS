import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AnalyticsPage } from '../AnalyticsPage'
import { describe, test, expect, vi, beforeEach } from 'vitest'

const mockSummary = {
  total_dies: 3087,
  round_dies: 3042,
  flat_dies: 45,
  total_sets: 144,
  total_manufacturers: 3,
  sets_summary: {
    total_sets: 144,
    dies_in_sets: 3087,
    dies_in_storage: 0,
  },
  manufacturers: [
    {
      id: null,
      name: 'Unassigned',
      total_dies: 3087,
      round_dies: 3042,
      flat_dies: 45,
      percentage: 100.0,
    },
    {
      id: 1,
      name: 'MIKROTEK',
      total_dies: 0,
      round_dies: 0,
      flat_dies: 0,
      percentage: 0.0,
    },
  ],
}

const mockRequest = vi.fn()

vi.mock('../../hooks/useApi', () => ({
  useApi: () => ({
    request: mockRequest,
  }),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

describe('AnalyticsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest.mockResolvedValue(mockSummary)
  })

  test('renders loading skeleton while fetching data', () => {
    // Return pending promise
    mockRequest.mockReturnValue(new Promise(() => {}))
    const client = createTestQueryClient()

    render(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <AnalyticsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText(/Tool Room Analytics/i)).toBeInTheDocument()
  })

  test('renders top KPI cards and manufacturer breakdown when data arrives', async () => {
    const client = createTestQueryClient()

    render(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <AnalyticsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Wait for data
    const totalElements = await screen.findAllByText('3,087')
    expect(totalElements.length).toBeGreaterThan(0)
    expect(screen.getAllByText('3,042').length).toBeGreaterThan(0)
    expect(screen.getAllByText('45').length).toBeGreaterThan(0)
    expect(screen.getAllByText('144').length).toBeGreaterThan(0)

    // Manufacturers
    expect(screen.getByText('MIKROTEK')).toBeInTheDocument()
    expect(screen.getByText(/Unassigned \/ None/i)).toBeInTheDocument()
  })

  test('renders error state on API failure', async () => {
    mockRequest.mockRejectedValue(new Error('Network error loading metrics'))
    const client = createTestQueryClient()

    render(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <AnalyticsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText(/Failed to load analytics summary/i)).toBeInTheDocument()
    expect(screen.getByText(/Network error loading metrics/i)).toBeInTheDocument()
  })
})
