// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { GroupPlanPanel } from '../src/view/GroupPlanPanel'
import type { GroupDetail } from '../src/controller/groupClient'

const organizer = '11111111-1111-4111-8111-111111111111'
const amy = '22222222-2222-4222-8222-222222222222'
const bo = '33333333-3333-4333-8333-333333333333'

const fixture = (patch: Partial<GroupDetail> = {}): GroupDetail => ({
  id: '44444444-4444-4444-8444-444444444444',
  eventId: '55555555-5555-4555-8555-555555555555',
  organizerId: organizer,
  status: 'proposed',
  revision: 3,
  participants: [
    { userId: amy, response: null },
    { userId: bo, response: 'if' },
  ],
  ...patch,
})

afterEach(cleanup)

describe('group proposal privacy, role and response view', () => {
  it('shows unknown separately from conditional, without inventing agreement', () => {
    const action = vi.fn()
    render(<GroupPlanPanel plan={fixture()} actorId={organizer} eventTitle="Jazz workshop"
      participantName={id => id === amy ? 'Amy' : 'Bo'} onAction={action} onRefresh={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Jazz workshop' })).toBeTruthy()
    const responses = within(screen.getByRole('region', { name: 'Participant responses' }))
    expect(responses.getByText('Awaiting response')).toBeTruthy()
    expect(responses.getByText('Conditional')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm group outing' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/Confirmation is available when every invited participant/)).toBeTruthy()
    expect(action).not.toHaveBeenCalled()
  })

  it('organizer can revoke and invite without editing another person\'s response', () => {
    const action = vi.fn()
    render(<GroupPlanPanel plan={fixture()} actorId={organizer} eventTitle="Jazz workshop"
      participantName={id => id === amy ? 'Amy' : 'Bo'} onAction={action} onRefresh={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Revoke invitation for Amy' }))
    expect(action).toHaveBeenLastCalledWith({
      action: 'remove', expectedRevision: 3, inviteeId: amy,
    })
    const input = screen.getByLabelText('Verified participant account ID')
    fireEvent.change(input, { target: { value: amy } })
    fireEvent.click(screen.getByRole('button', { name: 'Invite participant' }))
    expect(action).toHaveBeenLastCalledWith({
      action: 'invite', expectedRevision: 3, inviteeId: amy,
    })
    expect(screen.queryByRole('group', { name: 'Can you attend?' })).toBeNull()
  })

  it('participant can submit If with a required private condition, then Works', () => {
    const action = vi.fn()
    render(<GroupPlanPanel plan={fixture({
      participants: [{ userId: amy, response: null, privateCondition: null }],
    })} actorId={amy} eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    fireEvent.click(screen.getByRole('radio', { name: 'If…' }))
    expect(screen.getByLabelText('Your private condition')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save response' }).hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Your private condition'), {
      target: { value: '  After my class  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }))
    expect(action).toHaveBeenLastCalledWith({
      action: 'respond', expectedRevision: 3, response: 'if', condition: 'After my class',
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Works for me' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }))
    expect(action).toHaveBeenLastCalledWith({
      action: 'respond', expectedRevision: 3, response: 'works',
    })
    expect(screen.queryByRole('button', { name: 'Confirm group outing' })).toBeNull()
  })

  it('conditionally displays only the viewer\'s private condition even if a malicious projection includes others', () => {
    const plan = fixture({ participants: [
      { userId: amy, response: 'works', privateCondition: null },
      { userId: bo, response: 'if', privateCondition: 'Sensitive family obligation' },
    ] })
    const { rerender } = render(<GroupPlanPanel plan={plan} actorId={organizer}
      eventTitle="Jazz workshop" onAction={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.queryByText(/Sensitive family obligation/)).toBeNull()
    rerender(<GroupPlanPanel plan={plan} actorId={bo}
      eventTitle="Jazz workshop" onAction={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText('Your private condition: Sensitive family obligation')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirm group outing' })).toBeNull()
  })

  it('confirmed and cancelled plans cannot be edited, and outsiders receive no roster', () => {
    const action = vi.fn()
    const done = fixture({ status: 'confirmed',
      participants: [{ userId: amy, response: 'works' }],
    })
    const { rerender } = render(<GroupPlanPanel plan={done} actorId={organizer}
      eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    expect(screen.getByText('Confirmed')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cancel proposal' })).toBeNull()
    rerender(<GroupPlanPanel plan={done} actorId={amy} eventTitle="Jazz workshop"
      onAction={action} onRefresh={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Save response' })).toBeNull()
    rerender(<GroupPlanPanel plan={done} actorId="outsider" eventTitle="Jazz workshop"
      onAction={action} onRefresh={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toMatch(/do not have access/)
    expect(screen.queryByText(amy)).toBeNull()
    expect(action).not.toHaveBeenCalled()
  })

  it('enables confirmation only after every actual invitation explicitly says Works', () => {
    const action = vi.fn()
    render(<GroupPlanPanel plan={fixture({
      participants: [{ userId: amy, response: 'works' }, { userId: bo, response: 'works' }],
    })} actorId={organizer} eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    const approve = screen.getByRole('button', { name: 'Confirm group outing' })
    expect(approve.hasAttribute('disabled')).toBe(false)
    fireEvent.click(approve)
    expect(action).toHaveBeenCalledWith({ action: 'confirm', expectedRevision: 3 })
  })

  it('requires an explicit answer on a new invitation instead of preselecting Works', () => {
    const action = vi.fn()
    render(<GroupPlanPanel plan={fixture({
      participants: [{ userId: amy, response: null, privateCondition: null }],
    })} actorId={amy} eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    expect((screen.getByRole('radio', { name: 'Works for me' }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('radio', { name: "Can't make it" }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('button', { name: 'Save response' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: "Can't make it" }))
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }))
    expect(action).toHaveBeenCalledWith({
      action: 'respond', expectedRevision: 3, response: 'cant',
    })
  })

  it('restores a saved reply and updates it after a server refresh', () => {
    const action = vi.fn()
    const initial = fixture({
      participants: [{ userId: amy, response: 'cant', privateCondition: null }],
    })
    const { rerender } = render(<GroupPlanPanel plan={initial} actorId={amy}
      eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    expect((screen.getByRole('radio', { name: "Can't make it" }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }))
    expect(action).toHaveBeenLastCalledWith({
      action: 'respond', expectedRevision: 3, response: 'cant',
    })
    rerender(<GroupPlanPanel plan={{
      ...initial, revision: 4,
      participants: [{ userId: amy, response: 'works', privateCondition: null }],
    }} actorId={amy} eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    expect((screen.getByRole('radio', { name: 'Works for me' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: "Can't make it" }) as HTMLInputElement).checked).toBe(false)
  })

  it('preserves overlong pasted condition text and blocks saving until corrected', () => {
    const action = vi.fn()
    render(<GroupPlanPanel plan={fixture({
      participants: [{ userId: amy, response: 'if', privateCondition: 'After class' }],
    })} actorId={amy} eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    const field = screen.getByLabelText('Your private condition') as HTMLTextAreaElement
    expect(field.value).toBe('After class')
    expect(field.getAttribute('aria-describedby')).toBeTruthy()
    const pasted = 'x'.repeat(300)
    fireEvent.change(field, { target: { value: pasted } })
    expect(field.value).toBe(pasted)
    expect(field.maxLength).toBe(-1)
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toContain('280 characters')
    expect((screen.getByRole('button', { name: 'Save response' }) as HTMLButtonElement).disabled).toBe(true)
    expect(action).not.toHaveBeenCalled()
    fireEvent.change(field, { target: { value: 'x'.repeat(280) } })
    expect(field.getAttribute('aria-invalid')).toBe('false')
    expect((screen.getByRole('button', { name: 'Save response' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }))
    expect(action).toHaveBeenLastCalledWith({
      action: 'respond', expectedRevision: 3, response: 'if', condition: 'x'.repeat(280),
    })
  })

  it('lets a participant preview dictation text, then explicitly copy and save the original private wording', () => {
    const action = vi.fn()
    const spoken = "I think I'm free Saturday after three, but need to be home by seven. Nearby works best."
    render(<GroupPlanPanel plan={fixture({
      participants: [{ userId: amy, response: null, privateCondition: null }],
    })} actorId={amy} eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    const input = screen.getByLabelText('What works for you?') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: spoken } })
    expect(action).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Availability cue preview' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Preview availability cues' }))
    const review = within(screen.getByRole('region', { name: 'Availability cue preview' }))
    expect(review.getByText('Saturday')).toBeTruthy()
    expect(review.getByText('three')).toBeTruthy()
    expect(review.getByText('seven')).toBeTruthy()
    expect(review.getByText(/travel time/)).toBeTruthy()
    expect(action).not.toHaveBeenCalled()

    fireEvent.click(review.getByRole('button', { name: 'Use as private condition' }))
    expect((screen.getByRole('radio', { name: 'If…' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Your private condition') as HTMLTextAreaElement).value).toBe(spoken)
    expect(screen.getByRole('status').textContent).toMatch(/Copied into your private condition/)
    expect(action).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }))
    expect(action).toHaveBeenCalledExactlyOnceWith({
      action: 'respond', expectedRevision: 3, response: 'if', condition: spoken,
    })
  })

  it('preserves an overlong spoken draft and blocks copying instead of silently truncating it', () => {
    const action = vi.fn()
    render(<GroupPlanPanel plan={fixture({
      participants: [{ userId: amy, response: null, privateCondition: null }],
    })} actorId={amy} eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    const input = screen.getByLabelText('What works for you?') as HTMLTextAreaElement
    const spoken = 'Saturday after three ' + 'x'.repeat(300)
    fireEvent.change(input, { target: { value: spoken } })
    expect(input.value).toBe(spoken)
    expect(input.maxLength).toBe(-1)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Preview availability cues' }))
    expect(within(screen.getByRole('region', { name: 'Availability cue preview' }))
      .getByRole('button', { name: 'Use as private condition' }).hasAttribute('disabled')).toBe(true)
    expect(action).not.toHaveBeenCalled()
  })

  it('clears the unsaved local preview when the verified participant changes', () => {
    const action = vi.fn()
    const plan = fixture({ participants: [
      { userId: amy, response: null, privateCondition: null },
      { userId: bo, response: null, privateCondition: null },
    ] })
    const { rerender } = render(<GroupPlanPanel plan={plan} actorId={amy}
      eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('What works for you?'), {
      target: { value: 'Saturday after 3 pm' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview availability cues' }))
    expect(screen.getByRole('region', { name: 'Availability cue preview' })).toBeTruthy()
    rerender(<GroupPlanPanel plan={plan} actorId={bo}
      eventTitle="Jazz workshop" onAction={action} onRefresh={vi.fn()} />)
    expect((screen.getByLabelText('What works for you?') as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByRole('region', { name: 'Availability cue preview' })).toBeNull()
    expect(action).not.toHaveBeenCalled()
  })

  it('does not offer the assistant to the organizer, outsiders or confirmed plans', () => {
    const props = { eventTitle: 'Jazz workshop', onAction: vi.fn(), onRefresh: vi.fn() }
    const { rerender } = render(<GroupPlanPanel plan={fixture()} actorId={organizer} {...props} />)
    expect(screen.queryByLabelText('What works for you?')).toBeNull()
    rerender(<GroupPlanPanel plan={fixture()} actorId="outsider" {...props} />)
    expect(screen.queryByLabelText('What works for you?')).toBeNull()
    rerender(<GroupPlanPanel plan={fixture({ status: 'confirmed' })} actorId={amy} {...props} />)
    expect(screen.queryByLabelText('What works for you?')).toBeNull()
  })
})
