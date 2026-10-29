// @vitest-environment jsdom
// M1 requirements R1-R4: exercise the rendered React UI and browser storage.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { STORAGE_KEY } from '../src/model/events'

type User = ReturnType<typeof userEvent.setup>

async function createWorkshop(user: User, title = 'Art Workshop') {
  const form = document.querySelector<HTMLFormElement>('.event-form')
  if (!form) throw new Error('Create-event form was not rendered')
  await user.type(within(form).getByLabelText('EVENT NAME'), title)
  await user.type(within(form).getByLabelText('LOCATION'), 'Arts Building')
  fireEvent.change(within(form).getByLabelText('DATE'), { target: { value: '2026-10-28' } })
  fireEvent.change(within(form).getByLabelText('START'), { target: { value: '14:30' } })
  fireEvent.change(within(form).getByLabelText('END'), { target: { value: '15:30' } })
  await user.click(within(form).getByRole('button', { name: /create event/i }))
}

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('crypto', { randomUUID: () => 'm1-workshop-1' })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('M1 rendered user workflow', () => {
  it('R1/R3: creates an event from the form, confirms it, and shows a full-fit search result', async () => {
    const user = userEvent.setup()
    render(<App />)
    await createWorkshop(user)

    expect(screen.getByRole('status').textContent).toContain('Created “Art Workshop”')
    expect(screen.getByRole('heading', { name: 'Art Workshop' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove Art Workshop' })).toBeTruthy()
    expect(screen.getByText('1 total')).toBeTruthy()
    expect(screen.getByText('1 event')).toBeTruthy()
    expect(screen.getByText('✓ Fits')).toBeTruthy()
  })

  it('R2: preserves events across unmount/reload and persists removal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await createWorkshop(user)
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(1)
    })

    cleanup() // Simulates closing the page; storage is intentionally preserved.
    render(<App />)
    expect(screen.getByRole('button', { name: 'Remove Art Workshop' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    expect(screen.getByRole('status').textContent).toContain('Event removed.')
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual([])
    })

    cleanup()
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Remove Art Workshop' })).toBeNull()
    expect(screen.getByText('Events you create will show up here.')).toBeTruthy()
  })

  it('R4: displays a useful error when the title contains only whitespace', async () => {
    const user = userEvent.setup()
    render(<App />)
    await createWorkshop(user, '   ')
    expect(screen.getByRole('alert').textContent).toContain('Please enter an event title and location.')
    expect(screen.getByText('0 total')).toBeTruthy()
  })

  it('R4: rejects reversed event times and leaves the list unchanged', async () => {
    const user = userEvent.setup()
    render(<App />)
    const form = document.querySelector<HTMLFormElement>('.event-form')
    if (!form) throw new Error('Create-event form was not rendered')
    await user.type(within(form).getByLabelText('EVENT NAME'), 'Late Workshop')
    await user.type(within(form).getByLabelText('LOCATION'), 'Library')
    fireEvent.change(within(form).getByLabelText('START'), { target: { value: '17:00' } })
    fireEvent.change(within(form).getByLabelText('END'), { target: { value: '16:00' } })
    await user.click(within(form).getByRole('button', { name: /create event/i }))
    expect(screen.getByRole('alert').textContent).toContain('The event must end later than it starts')
    expect(screen.getByText('0 total')).toBeTruthy()
  })

  it('R3/R4: displays both empty-search states and an invalid-search message', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('No events yet. Create your first event above!')).toBeTruthy()
    await createWorkshop(user)
    fireEvent.change(screen.getByLabelText('Free from'), { target: { value: '17:00' } })
    fireEvent.change(screen.getByLabelText('Free until'), { target: { value: '18:00' } })
    expect(screen.getByText('No created events fit this date and time. Try a different window.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Free until'), { target: { value: '16:00' } })
    expect(screen.getByRole('alert').textContent).toContain('Please choose an end time later')
    expect(screen.getByText('Correct your available date or time to see matching events.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Free until'), { target: { value: '18:00' } })
    fireEvent.change(screen.getByLabelText('Free on date'), { target: { value: '' } })
    expect(screen.getByRole('alert').textContent).toContain('Please choose a valid date.')
  })

  it('R2/R4: warns the user when the browser refuses to save events', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage denied')
    })
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Browser storage is unavailable')
    })
  })

  it('R2/R4: recovers from malformed saved JSON without crashing the UI', () => {
    window.localStorage.setItem(STORAGE_KEY, '{corrupt json')
    render(<App />)
    expect(screen.getByText('Events you create will show up here.')).toBeTruthy()
    expect(screen.getByText('0 total')).toBeTruthy()
  })
})
