// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ToastStack, type ToastItem } from '../src/view/Toasts'

afterEach(() => { cleanup(); vi.useRealTimers() })
const timerOf = (text: string) => screen.getByText(text).closest('.sq-toast')!.querySelector('.sq-toast-timer')!

describe('ToastStack: temporary action feedback', () => {
  it('leaves on its own when its timer bar finishes, with a short exit first', () => {
    vi.useFakeTimers()
    render(<ToastStack toasts={[{ key: 'm1', tone: 'success', text: 'Added “Art” to My Schedule.' }]} />)
    expect(screen.getByRole('status').textContent).toContain('Added “Art”')
    fireEvent.animationEnd(timerOf('Added “Art” to My Schedule.'))
    expect(screen.getByRole('status').className).toContain('sq-toast-leaving')
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps errors until they are dismissed, and offers their action', () => {
    vi.useFakeTimers()
    const recover = vi.fn()
    render(<ToastStack toasts={[{ key: 'e1', tone: 'error', text: 'Some saved plans could not be read.', action: { label: 'Recover valid plans', onClick: recover } }]} />)
    expect(document.querySelector('.sq-toast-timer')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Recover valid plans' }))
    expect(recover).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }))
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the same words again for a new action, but not a dismissed one', () => {
    vi.useFakeTimers()
    const toast = (key: string): ToastItem => ({ key, tone: 'success', text: 'Removed from your plans.' })
    const { rerender } = render(<ToastStack toasts={[toast('m1')]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }))
    act(() => { vi.advanceTimersByTime(250) })
    rerender(<ToastStack toasts={[toast('m1')]} />)
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<ToastStack toasts={[toast('m2')]} />)
    expect(screen.getByRole('status').textContent).toBe('✓Removed from your plans.×')
  })
})
