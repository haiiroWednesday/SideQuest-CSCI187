// VIEW: R-D7 design preview. A future authorized submission and moderation service
// may deliver postcards to hosts. This component performs no upload or delivery.
import { useEffect, useState } from 'react'

export function PostcardPrompt({ title }: { title: string }) {
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [line, setLine] = useState('')
  const [previewed, setPreviewed] = useState(false)
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo) }, [photo])
  if (previewed) return <p className="sq-pc-sent" role="status">Preview complete. Nothing was sent to the host.</p>
  if (!open) return (
    <div className="sq-pc-ask">
      <span className="sq-pc-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5l1.6 5.4L19 12l-5.4 1.6L12 19l-1.6-5.4L5 12l5.4-1.6Z" /></svg></span>
      <button type="button" className="sq-pc-open" onClick={() => setOpen(true)}>Preview a postcard for the host</button>
    </div>
  )
  return (
    <form className="sq-pc" onSubmit={e => { e.preventDefault(); setPreviewed(true) }} aria-label={`Preview a postcard about ${title}`}>
      <p>Preview only. Your photo and message will not be uploaded or delivered.</p>
      <label className="sq-pc-photo">
        {photo ? <img src={photo} alt="Your photo" /> : <span>+ Add a photo</span>}
        <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)) }} />
      </label>
      <input className="sq-pc-line" value={line} maxLength={140} onChange={e => setLine(e.target.value)} placeholder="Add a line" />
      <div className="sq-pc-row"><button type="submit" className="sq-plan-button">Finish preview</button></div>
    </form>
  )
}
