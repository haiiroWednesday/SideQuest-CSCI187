// @vitest-environment jsdom
// The Post form follows SCU's posting policy: organizer, email or phone, the Access Policy
// Statement built from them (not editable), and "Room or space is confirmed".
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostEventForm } from '../src/view/PostEventForm'
import { ACCESS_POLICY_ON, createEventCatalog, type EventRow } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'

const now = () => new Date('2030-11-07T09:00:00-08:00')
const form = () => within(document.querySelector<HTMLFormElement>('.event-form')!)
function renderForm() {
  const rows = new Map<string, EventRow>()
  render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows), now), shared: true }} now={now} />)
  return rows
}
function fillBase() {
  const f = form()
  for (const [label, value] of Object.entries({ 'EVENT NAME': 'Photo Walk', 'HOST NAME': 'Art Club', DESCRIPTION: 'Bring a camera.', LOCATION: 'Library' })) {
    fireEvent.change(f.getByLabelText(label), { target: { value } })
  }
  fireEvent.change(f.getByLabelText('DATE'), { target: { value: '2030-11-14' } })
  fireEvent.change(f.getByLabelText('START'), { target: { value: '14:30' } })
  fireEvent.change(f.getByLabelText('END'), { target: { value: '15:30' } })
}
afterEach(() => cleanup())

// Switched off with ACCESS_POLICY_ON (Cyn, Nov 24); kept for if it is switched on again.
describe.runIf(ACCESS_POLICY_ON)('Post form: SCU posting policy', () => {
  it('builds the access statement from the organizer and contact, and it cannot be typed into', () => {
    renderForm()
    const f = form()
    const statement = screen.getByTestId('access-statement')
    expect(statement.textContent).toBe('In compliance with the ADA/504, please direct your accommodation requests to NAME at EMAIL ADDRESS.')
    expect(statement.closest('textarea, input, [contenteditable="true"]')).toBeNull()
    fireEvent.change(f.getByLabelText('ORGANIZER'), { target: { value: 'Ana Ruiz' } })
    fireEvent.change(f.getByLabelText('CONTACT'), { target: { value: 'ana@scu.edu' } })
    expect(statement.textContent).toBe('In compliance with the ADA/504, please direct your accommodation requests to Ana Ruiz at ana@scu.edu.')
  })

  it('shows inline errors and stores nothing until organizer, contact and the space check are done', async () => {
    const rows = renderForm()
    fillBase()
    const f = form()
    await userEvent.click(f.getByRole('button', { name: /post event/i }))
    expect(await screen.findByText(/primary student organizer/)).toBeTruthy()
    expect(screen.getByText(/email or phone number/)).toBeTruthy()
    expect(screen.getByText(/Confirm the room or space/)).toBeTruthy()
    expect(f.getByLabelText('ORGANIZER').getAttribute('aria-invalid')).toBe('true')
    expect(f.getByLabelText('Room or space is confirmed').getAttribute('aria-invalid')).toBe('true')
    expect(rows.size).toBe(0)
    fireEvent.change(f.getByLabelText('ORGANIZER'), { target: { value: 'Ana Ruiz' } })
    fireEvent.change(f.getByLabelText('CONTACT'), { target: { value: 'Ana' } })
    fireEvent.blur(f.getByLabelText('CONTACT'))
    expect(await screen.findByText(/Use an email address or a phone number/)).toBeTruthy()
    fireEvent.change(f.getByLabelText('CONTACT'), { target: { value: '(408) 554-4000' } })
    fireEvent.click(f.getByLabelText('Room or space is confirmed'))
    await waitFor(() => expect(screen.queryByText(/Confirm the room or space/)).toBeNull())
    await userEvent.click(f.getByRole('button', { name: /post event/i }))
    await waitFor(() => expect(rows.size).toBe(1))
    expect([...rows.values()][0]).toMatchObject({
      organizer: 'Ana Ruiz', contact: '(408) 554-4000',
      accessibility: 'In compliance with the ADA/504, please direct your accommodation requests to Ana Ruiz at (408) 554-4000.',
    })
    // Organizer and contact stay for the next, similar post; the space must be confirmed again.
    expect((f.getByLabelText('CONTACT') as HTMLInputElement).value).toBe('(408) 554-4000')
    expect((f.getByLabelText('Room or space is confirmed') as HTMLInputElement).checked).toBe(false)
  })

  it('lets a university department post without the statement; a student organization cannot', async () => {
    const rows = renderForm()
    fillBase()
    const f = form()
    expect((f.getByLabelText('Student organization') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(f.getByLabelText('Room or space is confirmed'))
    fireEvent.click(f.getByLabelText('University department'))
    expect(screen.getByText('Department events may skip the access statement.')).toBeTruthy()
    expect(screen.getByTestId('access-statement').textContent).toBe('None. Add an organizer and contact to include it.')
    await userEvent.click(f.getByRole('button', { name: /post event/i }))
    await waitFor(() => expect(rows.size).toBe(1))
    const [row] = [...rows.values()]
    expect(row).toMatchObject({ host_kind: 'department' })
    expect(row).not.toHaveProperty('accessibility')
  })
})

describe.runIf(!ACCESS_POLICY_ON)('Post form without the ADA rule', () => {
  it('asks for no organizer, contact, statement or space check', () => {
    renderForm()
    expect(screen.queryByLabelText('ORGANIZER')).toBeNull()
    expect(screen.queryByLabelText('CONTACT')).toBeNull()
    expect(screen.queryByLabelText('Room or space is confirmed')).toBeNull()
    expect(screen.queryByTestId('access-statement')).toBeNull()
  })
})
