// DEV-ONLY DEMO. This does not authenticate or invoke the group API.
// Fake participant data is in component memory and resets on a page refresh.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { GroupAction, GroupDetail } from '../controller/groupClient'
import { GroupPlanPanel } from '../view/GroupPlanPanel'
import '../style.css'

const organizer = '11111111-1111-4111-8111-111111111111'
const student = '22222222-2222-4222-8222-222222222222'
const friend = '33333333-3333-4333-8333-333333333333'
const example: GroupDetail = {
  id: '44444444-4444-4444-8444-444444444444',
  eventId: '55555555-5555-4555-8555-555555555555',
  organizerId: organizer,
  status: 'proposed',
  revision: 1,
  participants: [
    { userId: student, response: null, privateCondition: null },
    { userId: friend, response: null, privateCondition: null },
  ],
}

function GroupAvailabilityLab() {
  const [plan, setPlan] = useState<GroupDetail>(example)
  const [message, setMessage] = useState('')
  const act = (command: GroupAction) => {
    if (command.action !== 'respond') return
    setPlan(old => ({
      ...old,
      revision: old.revision + 1,
      participants: old.participants.map(p => p.userId === student
        ? { ...p, response: command.response,
            privateCondition: command.response === 'if' ? command.condition ?? null : null }
        : p),
    }))
    setMessage('Response simulated locally. Nothing was submitted to a server.')
  }
  return (
    <div className="sq-discover-page">
      <main className="sq-main" id="content">
        <section className="sq-hero" aria-labelledby="sq-lab-title">
          <h1 id="sq-lab-title">Availability <em>prototype.</em></h1>
          <p>Sample data only. Try describing when you are free, review the cues,
            and decide whether to use the text in a private conditional reply.</p>
          <p>This page has no login, recording, AI model, network submission, or saved group.
            Its sample response resets when the page reloads.</p>
        </section>
        <GroupPlanPanel plan={plan} actorId={student} eventTitle="Sample campus art workshop"
          participantName={id => id === student ? 'Student A' : id === friend ? 'Student B' : 'Organizer'}
          onAction={act} onRefresh={() => setMessage('This preview has no remote responses to refresh.')} />
        {message && <p role="status">{message}</p>}
      </main>
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw Error('Missing prototype root')
createRoot(root).render(<GroupAvailabilityLab />)
