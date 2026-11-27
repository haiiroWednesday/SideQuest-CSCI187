// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GroupEmailLoginView } from '../src/view/GroupEmailLoginView'

afterEach(() => { cleanup(); vi.useRealTimers() })

const routes = { discover: '#discover', login: '#login' }

describe('email sign-in screen: code first', () => {
  it('goes straight to the code after sending, verifies it and never shows tokens', async () => {
    const requestCode = vi.fn(async () => true)
    const verifyCode = vi.fn(async () => true)
    const onSuccess = vi.fn()
    const { container } = render(<GroupEmailLoginView routes={routes}
      busy={false} error={null} message={null}
      requestCode={requestCode} verifyCode={verifyCode} onSuccess={onSuccess} />)

    expect(screen.queryByLabelText('Verification code')).toBeNull()
    fireEvent.change(screen.getByLabelText('Santa Clara email'), { target: { value: 'student@scu.edu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a code' }))
    await waitFor(() => expect(requestCode).toHaveBeenCalledWith('student@scu.edu'))
    await screen.findByRole('heading', { name: 'Enter the code from your email' })
    expect(container.textContent).toContain('student@scu.edu')
    expect(screen.queryByText(/tap the link/i)).toBeNull()
    expect((screen.getByLabelText('Santa Clara email') as HTMLInputElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(verifyCode).toHaveBeenCalledWith('student@scu.edu', '123456'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(container.textContent).not.toContain('access_token')
  })

  it('announces confirmed sign-out and distinguishes an unconfirmed revocation', () => {
    const props = { routes, busy: false, requestCode: vi.fn(async () => true),
      verifyCode: vi.fn(async () => false), onSuccess: vi.fn() }
    const { rerender } = render(<GroupEmailLoginView {...props}
      error={null} message="Signed out of this session." />)
    expect(screen.getByRole('status').textContent).toBe('Signed out of this session.')
    rerender(<GroupEmailLoginView {...props}
      error="Server revocation could not be confirmed." message={null} />)
    expect(screen.getByRole('alert').textContent).toContain('could not be confirmed')
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByLabelText('Santa Clara email')).toBeTruthy()
  })

  it('makes the student wait a minute before asking for another code', async () => {
    vi.useFakeTimers()
    const requestCode = vi.fn(async () => true)
    render(<GroupEmailLoginView routes={routes} busy={false} error={null} message={null}
      requestCode={requestCode} verifyCode={vi.fn(async () => false)} onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Santa Clara email'), { target: { value: 'student@scu.edu' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Email me a code' })) })
    const resend = screen.getByRole('button', { name: /Send a new code in 60s/ }) as HTMLButtonElement
    expect(resend.disabled).toBe(true)
    for (let second = 0; second < 59; second++) await act(async () => { vi.advanceTimersByTime(1000) })
    expect((screen.getByRole('button', { name: /Send a new code in 1s/ }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { vi.advanceTimersByTime(1000) })
    const ready = screen.getByRole('button', { name: 'Send a new code' }) as HTMLButtonElement
    expect(ready.disabled).toBe(false)
    await act(async () => { fireEvent.click(ready) })
    expect(requestCode).toHaveBeenCalledTimes(2)
  })

  it('stays on the email step when the email did not send', async () => {
    const onSuccess = vi.fn()
    const requestCode = vi.fn(async () => false)
    const { rerender } = render(<GroupEmailLoginView routes={routes}
      busy={false} error="The email limit was reached. Try again in an hour." message={null}
      requestCode={requestCode} verifyCode={vi.fn(async () => false)} onSuccess={onSuccess} />)
    expect(screen.getByRole('alert').textContent).toContain('limit')
    fireEvent.change(screen.getByLabelText('Santa Clara email'), { target: { value: 'student@scu.edu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a code' }))
    await waitFor(() => expect(requestCode).toHaveBeenCalledOnce())
    expect(screen.queryByRole('heading', { name: 'Enter the code from your email' })).toBeNull()
    expect(screen.queryByLabelText('Verification code')).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()
    rerender(<GroupEmailLoginView routes={routes} busy={true} error={null} message={null}
      requestCode={requestCode} verifyCode={vi.fn(async () => false)} onSuccess={onSuccess} />)
    expect((screen.getByRole('button', { name: 'Checking…' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
