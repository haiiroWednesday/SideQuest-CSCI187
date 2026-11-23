// VIEW: participant and organizer controls for an authorized plan projection.
// Caller identity is supplied by a verified session layer, never entered here.
import { useEffect, useState, type FormEvent } from 'react'
import { MAX_GROUP_INVITEES, MAX_PRIVATE_CONDITION, type GroupAction, type GroupDetail, type GroupResponse } from '../controller/groupClient'
import { AvailabilityDraftHelper } from './AvailabilityDraftHelper'
import './group-planning.css'

const responseText: Record<GroupResponse, string> = {
  works: 'Works for me',
  if: 'If…',
  cant: "Can't make it",
}
const responseDescription: Record<GroupResponse, string> = {
  works: 'Available',
  if: 'Conditional',
  cant: 'Unavailable',
}
const statusText: Record<GroupDetail['status'], string> = {
  proposed: 'Awaiting responses',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

export type GroupPlanPanelProps = {
  plan: GroupDetail
  actorId: string
  eventTitle: string
  participantName?: (id: string) => string
  busy?: boolean
  error?: string | null
  onAction: (command: GroupAction) => void
  onRefresh: () => void
}

export function GroupPlanPanel({
  plan, actorId, eventTitle, participantName = id => id,
  busy = false, error, onAction, onRefresh,
}: GroupPlanPanelProps) {
  const organizer = plan.organizerId === actorId
  const self = plan.participants.find(participant => participant.userId === actorId)
  // No response must remain unselected until the participant explicitly chooses.
  const [choice, setChoice] = useState<GroupResponse | null>(self?.response ?? null)
  const [condition, setCondition] = useState(self?.response === 'if' ? self.privateCondition ?? '' : '')
  const [invitee, setInvitee] = useState('')
  // When a refresh or another browser changes our saved answer, show the server's
  // current value. Unrelated participants' changes do not reset an unsaved draft.
  useEffect(() => {
    setChoice(self?.response ?? null)
    setCondition(self?.response === 'if' ? self.privateCondition ?? '' : '')
  }, [actorId, plan.id, self?.response, self?.privateCondition])
  const conditionLength = condition.trim().length
  const conditionInvalid = choice === 'if' && (conditionLength === 0 || conditionLength > MAX_PRIVATE_CONDITION)
  const member = organizer || Boolean(self)
  const actionable = plan.status === 'proposed' && !busy
  const allWork = plan.participants.length > 0 &&
    plan.participants.every(participant => participant.response === 'works')
  const onRespond = (event: FormEvent) => {
    event.preventDefault()
    if (!actionable || !self || !choice || conditionInvalid) return
    onAction({
      action: 'respond',
      expectedRevision: plan.revision,
      response: choice,
      ...(choice === 'if' ? { condition: condition.trim() } : {}),
    })
  }
  const onInvite = (event: FormEvent) => {
    event.preventDefault()
    if (!organizer || !actionable || !invitee) return
    onAction({ action: 'invite', expectedRevision: plan.revision, inviteeId: invitee })
  }

  if (!member) return <p role="alert">You do not have access to this plan.</p>

  return (
    <section className="sq-group-plan" aria-labelledby={'sq-group-' + plan.id}>
      <header className="sq-group-heading">
        <div>
          <p className="sq-group-eyebrow">Group outing</p>
          <h2 id={'sq-group-' + plan.id}>{eventTitle}</h2>
        </div>
        <span className={'sq-group-state sq-group-state-' + plan.status}>{statusText[plan.status]}</span>
      </header>
      <p>Everyone can respond independently. No response means the invitation is still pending.</p>
      <p className="sq-group-privacy">The organizer and other participants can see your response, but only you can see your private condition.</p>
      {error && <div role="alert" className="sq-group-error">{error}</div>}

      <section aria-label="Participant responses" className="sq-group-members">
        <h3>Responses</h3>
        {plan.participants.length === 0 ? (
          <p>No participants invited yet.</p>
        ) : (
          <ul>
            {plan.participants.map(participant => (
              <li key={participant.userId}>
                <span className="sq-group-member-name">{participantName(participant.userId)}{participant.userId === actorId ? ' (you)' : ''}</span>
                <span className="sq-group-response">
                  {participant.response === null ? 'Awaiting response' : responseDescription[participant.response]}
                </span>
                {participant.userId === actorId && participant.response === 'if' &&
                  participant.privateCondition && (
                    <p className="sq-group-condition">Your private condition: {participant.privateCondition}</p>
                  )}
                {organizer && participant.userId !== actorId && actionable && (
                  <button type="button" className="sq-group-link"
                    onClick={() => onAction({ action: 'remove', expectedRevision: plan.revision, inviteeId: participant.userId })}>
                    Revoke invitation for {participantName(participant.userId)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {self && plan.status === 'proposed' && (
        <form className="sq-group-form" onSubmit={onRespond}>
          <h3>Your response</h3>
          <AvailabilityDraftHelper key={plan.id + ':' + actorId} disabled={!actionable}
            onUse={text => {
              // Copy the student's exact approved words only into their own
              // private conditional response; no write occurs until Save.
              setChoice('if')
              setCondition(text)
            }} />
          <fieldset disabled={!actionable}>
            <legend>Can you attend?</legend>
            <div className="sq-group-choices">
              {(['works', 'if', 'cant'] as const).map(value => (
                <label key={value}>
                  <input type="radio" name={'group-response-' + plan.id}
                    value={value} checked={choice === value}
                    onChange={() => setChoice(value)} />
                  <span>{responseText[value]}</span>
                </label>
              ))}
            </div>
            {choice === 'if' && <>
              <label htmlFor={'group-condition-' + plan.id}>Your private condition</label>
              <p id={'group-condition-hint-' + plan.id} className="sq-group-privacy">
                Up to {MAX_PRIVATE_CONDITION} characters. Overlong text stays editable but cannot be submitted.
              </p>
              <textarea id={'group-condition-' + plan.id} required
                aria-describedby={'group-condition-hint-' + plan.id}
                aria-invalid={conditionLength > MAX_PRIVATE_CONDITION}
                value={condition} onChange={e => setCondition(e.target.value)}
                placeholder="I can come after my class ends" />
              <p className="sq-group-privacy">{conditionLength}/{MAX_PRIVATE_CONDITION} characters</p>
              {conditionLength > MAX_PRIVATE_CONDITION && <p role="alert" className="sq-group-error">
                Shorten your condition to {MAX_PRIVATE_CONDITION} characters before saving.
              </p>}
            </>}
            <button type="submit" disabled={!choice || conditionInvalid}>
              {busy ? 'Saving response…' : 'Save response'}
            </button>
          </fieldset>
        </form>
      )}

      {organizer && plan.status === 'proposed' && (
        <div className="sq-group-organizer">
          <form className="sq-group-form" onSubmit={onInvite}>
            <h3>Invite a participant</h3>
            <p>Invitations must refer to a verified member account. A shareable link cannot impersonate someone.</p>
            <fieldset disabled={!actionable || plan.participants.length >= MAX_GROUP_INVITEES}>
              <label htmlFor={'group-invite-' + plan.id}>Verified participant account ID</label>
              <input id={'group-invite-' + plan.id} value={invitee}
                onChange={e => setInvitee(e.target.value)} required
                pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                placeholder="Account UUID" />
              <button type="submit">Invite participant</button>
            </fieldset>
          </form>
          <div className="sq-group-actions">
            <button type="button" disabled={!actionable || !allWork}
              onClick={() => onAction({ action: 'confirm', expectedRevision: plan.revision })}>
              Confirm group outing
            </button>
            {!allWork && <p>Confirmation is available when every invited participant explicitly responds “Works for me.”</p>}
            <button type="button" className="sq-group-secondary" disabled={!actionable}
              onClick={() => onAction({ action: 'cancel', expectedRevision: plan.revision })}>
              Cancel proposal
            </button>
          </div>
        </div>
      )}
      <button type="button" className="sq-group-link" onClick={onRefresh} disabled={busy}>
        Refresh responses
      </button>
      <p className="sq-group-foot">An accepted group proposal is a plan between participants, not an event registration or ticket reservation.</p>
    </section>
  )
}
