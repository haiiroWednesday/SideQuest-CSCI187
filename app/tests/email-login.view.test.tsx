// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GroupEmailLoginView } from '../src/view/GroupEmailLoginView'

afterEach(cleanup)

describe('email sign-in screen: link first, code second', () => {
  it('asks for an email code, verifies it and continues without displaying access tokens', async () => {
    const requestCode = vi.fn(async () => true)
    const verifyCode = vi.fn(async () => true)
    const onSuccess = vi.fn()
    const { container } = render(<GroupEmailLoginView
      routes={{ discover: '#discover', login: '#login' }}
      busy={false} error={null} message={null}
      requestCode={requestCode} verifyCode={verifyCode} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText('Santa Clara email'), {
      target: { value: 'student@example.edu' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    await waitFor(() => expect(requestCode).toHaveBeenCalledWith('student@example.edu'))
    // The default Supabase email holds a link; the code is the second way in.
    await screen.findByRole('heading', { name: 'Check your email and tap the link' })
    expect(screen.queryByLabelText('Verification code')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Have a code instead?' }))
    await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy())
    expect((screen.getByLabelText('Santa Clara email') as HTMLInputElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Verification code'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))
    await waitFor(() => expect(verifyCode).toHaveBeenCalledWith('student@example.edu', '123456'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(container.textContent).not.toContain('access_token')
  })

  it('shows a failure without advancing to a verified session', async () => {
    const onSuccess = vi.fn()
    const requestCode = vi.fn(async () => false)
    const { rerender } = render(<GroupEmailLoginView
      routes={{ discover: '#discover', login: '#login' }}
      busy={false} error="The sign-in service is unavailable." message={null}
      requestCode={requestCode} verifyCode={vi.fn(async () => false)} onSuccess={onSuccess} />)
    expect(screen.getByRole('alert').textContent).toContain('sign-in service')
    fireEvent.change(screen.getByLabelText('Santa Clara email'), {
      target: { value: 'student@example.edu' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    await waitFor(() => expect(requestCode).toHaveBeenCalledOnce())
    expect(screen.queryByRole('heading', { name: 'Check your email and tap the link' })).toBeNull()
    expect(screen.queryByLabelText('Verification code')).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()
    rerender(<GroupEmailLoginView routes={{ discover: '#discover', login: '#login' }}
      busy={true} error={null} message={null} requestCode={requestCode}
      verifyCode={vi.fn(async () => false)} onSuccess={onSuccess} />)
    expect((screen.getByRole('button', { name: 'Checking…' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
