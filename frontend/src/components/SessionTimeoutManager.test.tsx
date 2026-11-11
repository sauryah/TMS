import React from 'react'
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionTimeoutManager } from './SessionTimeoutManager'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { useNavigate } from 'react-router-dom'

// Mock the modules
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

vi.mock('../hooks/useApi', () => ({
  useApi: vi.fn()
}))

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}))

describe('SessionTimeoutManager', () => {
  const mockLogout = vi.fn()
  const mockRequest = vi.fn()
  const mockNavigate = vi.fn()
  const mockSetToken = vi.fn()
  let currentToken: string | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    mockLogout.mockClear()
    mockRequest.mockClear()
    mockNavigate.mockClear()
    mockSetToken.mockClear()
    currentToken = null
    localStorage.clear()

    // Mock fetch for server-info and auth
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/v1/server-info/') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            session_idle_timeout_minutes: 30,
            session_absolute_timeout_hours: 12
          })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      refreshToken: null,
      logout: mockLogout,
      role: 'admin',
      username: 'test_operator',
      userId: 1,
      isAuthorizedForTools: false,
      authorizedTools: [],
      setToken: mockSetToken,
      setRefreshToken: vi.fn(),
      login: vi.fn(),
      handleRefreshFailure: vi.fn(),
      shouldBlockRefresh: vi.fn(),
      resetRefreshFailures: vi.fn()
    } as any)

    vi.mocked(useApi).mockReturnValue({
      request: mockRequest
    } as any)

    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should reset idle timer when token changes from null to valid', () => {
    // 1. Render with no token (user logged out/not logged in yet)
    currentToken = null
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      refreshToken: null,
      logout: mockLogout,
      role: null,
      username: null,
      userId: null,
      isAuthorizedForTools: false,
      authorizedTools: [],
      setToken: mockSetToken,
      setRefreshToken: vi.fn(),
      login: vi.fn(),
      handleRefreshFailure: vi.fn(),
      shouldBlockRefresh: vi.fn(),
      resetRefreshFailures: vi.fn()
    } as any)

    const { rerender } = render(<SessionTimeoutManager />)

    // 2. Advance time by 35 minutes while logged out (simulating user staying on login page)
    act(() => {
      vi.advanceTimersByTime(35 * 60 * 1000)
    })

    // 3. Log in (token becomes valid)
    currentToken = 'valid-token'
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      refreshToken: 'valid-refresh',
      logout: mockLogout,
      role: 'admin',
      username: 'test_operator',
      userId: 1,
      isAuthorizedForTools: false,
      authorizedTools: [],
      setToken: mockSetToken,
      setRefreshToken: vi.fn(),
      login: vi.fn(),
      handleRefreshFailure: vi.fn(),
      shouldBlockRefresh: vi.fn(),
      resetRefreshFailures: vi.fn()
    } as any)

    act(() => {
      rerender(<SessionTimeoutManager />)
    })

    // 4. Advance time by 1 second (triggers the interval check)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // 5. Assert that logout has NOT been called because the timer was reset on login!
    expect(mockLogout).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()

    // 6. Advance by 27 minutes (total 27m 1s after login). Should still be active.
    act(() => {
      vi.advanceTimersByTime(27 * 60 * 1000)
    })
    expect(mockLogout).not.toHaveBeenCalled()

    // 7. Advance past 28 minutes warning and reach 30 minutes (idle timeout -> lock screen)
    act(() => {
      vi.advanceTimersByTime(3 * 60 * 1000)
    })

    // Assert screen is locked and persisted in localStorage
    expect(screen.getByText('SESSION LOCKED')).toBeDefined()
    expect(localStorage.getItem('tms_is_locked')).toBe('true')
    expect(mockSetToken).toHaveBeenCalledWith(null)
    expect(localStorage.getItem('tms_token')).toBeNull()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/auth/lock/',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: expect.objectContaining({
          'X-Requested-With': 'XMLHttpRequest'
        })
      })
    )
    expect(mockLogout).not.toHaveBeenCalled()

    // 8. Advance past lock grace period (5 minutes unattended on lock screen) -> forced logout
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
    })

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('should restore locked state from localStorage on page reload', () => {
    localStorage.setItem('tms_is_locked', 'true')
    currentToken = 'valid-token'
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      logout: mockLogout,
      username: 'test_operator',
      setToken: mockSetToken
    } as any)

    render(<SessionTimeoutManager />)

    // Immediately shows locked screen because localStorage has tms_is_locked = true
    expect(screen.getByText('SESSION LOCKED')).toBeDefined()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  test('should handle MFA-required unlock without bypassing 2FA', async () => {
    currentToken = 'valid-token'
    localStorage.setItem('tms_is_locked', 'true')
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      logout: mockLogout,
      username: 'test_operator',
      setToken: mockSetToken
    } as any)

    render(<SessionTimeoutManager />)
    expect(screen.getByText('SESSION LOCKED')).toBeDefined()

    // 1. Submit password to unlock endpoint
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/v1/auth/login/') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            mfa_required: true,
            mfa_token: 'signed-mfa-token-xyz',
            username: 'test_operator',
            remaining_codes: 8
          })
        })
      }
      if (url === '/api/v1/auth/backup-codes/verify/') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'new-valid-jwt-token'
          })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const passwordInput = screen.getByPlaceholderText(/Enter password/i)
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    const unlockBtn = screen.getByText('Unlock Session')

    await act(async () => {
      fireEvent.click(unlockBtn)
    })

    // Assert: Screen must NOT unlock! It must transition to MFA backup code verification step!
    expect(screen.getByText(/Two-Factor Authentication Required/i)).toBeDefined()
    expect(screen.getByText(/Remaining backup codes: 8/i)).toBeDefined()
    expect(screen.getByPlaceholderText(/Enter single-use backup code/i)).toBeDefined()
    expect(localStorage.getItem('tms_is_locked')).toBe('true')
    expect(mockSetToken).not.toHaveBeenCalled()

    // 2. Submit backup code
    const mfaInput = screen.getByPlaceholderText(/Enter single-use backup code/i)
    fireEvent.change(mfaInput, { target: { value: 'ABCDEF12' } })
    const verifyMfaBtn = screen.getByText('Verify & Unlock')

    await act(async () => {
      fireEvent.click(verifyMfaBtn)
    })

    // Assert: Now it unlocks, sets token, and removes lock from localStorage
    expect(mockSetToken).toHaveBeenCalledWith('new-valid-jwt-token')
    expect(localStorage.getItem('tms_token')).toBe('new-valid-jwt-token')
    expect(localStorage.getItem('tms_is_locked')).toBeNull()
    expect(screen.queryByText('SESSION LOCKED')).toBeNull()
  })

  test('should display warning at 28 minutes and allow stayLoggedIn', async () => {
    currentToken = 'valid-token'
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      logout: mockLogout,
      username: 'test_operator',
      setToken: mockSetToken
    } as any)

    render(<SessionTimeoutManager />)

    // Advance to 28 minutes (warning triggered)
    act(() => {
      vi.advanceTimersByTime(28 * 60 * 1000 + 1000)
    })

    expect(screen.getByText(/SESSION TIMEOUT WARNING/i)).toBeDefined()

    // Click stay logged in
    mockRequest.mockResolvedValueOnce({ status: 'active' })
    const stayBtn = screen.getByText('Stay Logged In')
    await act(async () => {
      fireEvent.click(stayBtn)
    })

    expect(mockRequest).toHaveBeenCalledWith('/api/auth/keep-alive/', { method: 'POST' })
    expect(screen.queryByText(/SESSION TIMEOUT WARNING/i)).toBeNull()
  })

  test('should synchronize user activity across tabs via storage event', () => {
    currentToken = 'valid-token'
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      logout: mockLogout,
      username: 'test_operator',
      setToken: mockSetToken
    } as any)

    render(<SessionTimeoutManager />)

    // Advance to warning at 28m 30s
    act(() => {
      vi.advanceTimersByTime(28.5 * 60 * 1000)
    })
    expect(screen.getByText(/SESSION TIMEOUT WARNING/i)).toBeDefined()

    // Simulate activity in another browser tab
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'tms_last_activity',
        newValue: Date.now().toString()
      }))
    })

    // Advance 1 second - warning should be dismissed due to remote tab activity
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.queryByText(/SESSION TIMEOUT WARNING/i)).toBeNull()
  })

  test('should synchronize lock and unlock across tabs via storage event', () => {
    currentToken = 'valid-token'
    localStorage.setItem('tms_token', 'valid-token')
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      logout: mockLogout,
      username: 'test_operator',
      setToken: mockSetToken
    } as any)

    render(<SessionTimeoutManager />)

    // Simulate lock event in another browser tab
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'tms_is_locked',
        newValue: 'true'
      }))
    })

    expect(screen.getByText('SESSION LOCKED')).toBeDefined()
    expect(mockSetToken).toHaveBeenCalledWith(null)
    expect(localStorage.getItem('tms_token')).toBeNull()

    // Simulate unlock event in another browser tab
    localStorage.setItem('tms_token', 'unlocked-jwt-token')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'tms_is_locked',
        newValue: null
      }))
    })

    expect(mockSetToken).toHaveBeenCalledWith('unlocked-jwt-token')
    expect(screen.queryByText('SESSION LOCKED')).toBeNull()
  })
})
