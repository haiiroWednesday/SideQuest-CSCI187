// VIEW: R-D7. Once a plan has ended, its ticket asks for a postcard. It goes to the
// host first; only the host's picks are shown to other people (P1). Preview only:
// nothing is uploaded yet.
import { useState } from 'react'

export function PostcardPrompt({ title }: { title: string }) {
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [line, setLine] = useState('')
  const [sent, setSent] = useState(false)
  if (sent) return <p className="sq-pc-sent">Sent to the host.</p>
  if (!open) return (
    <div className="sq-pc-ask">
      <span className="sq-pc-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5l1.6 5.4L19 12l-5.4 1.6L12 19l-1.6-5.4L5 12l5.4-1.6Z" /></svg></span>
      <button type="button" className="sq-pc-open" onClick={() => setOpen(true)}>Send the host a postcard</button>
    </div>
  )
  return (
    <form className="sq-pc" onSubmit={e => { e.preventDefault(); setSent(true) }} aria-label={`Send a postcard about ${title}`}>
      <label className="sq-pc-photo">
        {photo ? <img src={photo} alt="Your photo" /> : <span>+ Add a photo</span>}
        <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)) }} />
      </label>
      <input className="sq-pc-line" value={line} maxLength={140} onChange={e => setLine(e.target.value)} placeholder="Add a line" />
      <div className="sq-pc-row"><button type="submit" className="sq-plan-button">Send to the host</button></div>
    </form>
  )
}
