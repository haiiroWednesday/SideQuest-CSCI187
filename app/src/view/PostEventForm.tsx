// VIEW: compose the post editor and catalog list without behavior flags.
// Posting validation and storage operations remain behind Controller ports.
import { useState, type FormEvent } from 'react'
import {
  postEvent,
  postingDraftErrors,
  initialCampusWindow,
  type CampusEvent,
  type CatalogFieldErrors,
  type ConnectedCatalog,
  type EventDraft,
} from '../controller/postEvent'
import { PostedEventsList } from './PostedEventsList'
import { PostEventFields } from './PostEventFields'

type Props = {
  connection: ConnectedCatalog
  now?: () => Date
  onPosted?: (event: CampusEvent) => void
}

// Full posting view: compose an editor, a connection notice, and the catalog list.
export function PostEventForm({ connection, now, onPosted }: Props) {
  const [revision, setRevision] = useState(0)
  const handlePosted = (event: CampusEvent) => {
    setRevision(current => current + 1)
    onPosted?.(event)
  }
  return (
    <>
      {!connection.shared && (
        <p className="storage-alert" data-testid="catalog-not-shared">
          Shared catalog not connected. Posts are saved in this browser only, and other people can't
          see them.
        </p>
      )}
      <PostEventEditor connection={connection} now={now} onPosted={handlePosted} />
      <PostedEventsList
        catalog={connection.catalog}
        shared={connection.shared}
        revision={revision}
      />
    </>
  )
}

// Embedded editor: the surrounding page already presents source status and its event list.
export function EmbeddedPostEventForm(props: Props) {
  return <PostEventEditor {...props} />
}

function PostEventEditor({ connection, now = () => new Date(), onPosted }: Props) {
  const { catalog, shared } = connection
  const [draft, setDraft] = useState<EventDraft>(() => ({
    title: '',
    hostName: '',
    description: '',
    location: '',
    ...initialCampusWindow(now()),
  }))
  const [fieldErrors, setFieldErrors] = useState<CatalogFieldErrors>({})
  const [validatedFields, setValidatedFields] = useState<
    Partial<Record<keyof EventDraft, boolean>>
  >({})
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const update = (field: keyof EventDraft, value: string) => {
    const nextDraft = { ...draft, [field]: value }
    setDraft(nextDraft)
    const errors = postingDraftErrors(nextDraft, now())
    setFieldErrors(previous => {
      const nextErrors = { ...previous }
      for (const checkedField of Object.keys({
        ...validatedFields,
        ...previous,
      }) as (keyof EventDraft)[]) {
        if (validatedFields[checkedField] || previous[checkedField])
          nextErrors[checkedField] = errors[checkedField]
      }
      return nextErrors
    })
    setFormError(null)
  }

  const validateOnBlur = (field: keyof EventDraft) => {
    setValidatedFields(previous => ({ ...previous, [field]: true }))
    const errors = postingDraftErrors(draft, now())
    setFieldErrors(previous => ({ ...previous, [field]: errors[field] }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return // prevents double posts from a double click
    setSubmitting(true)
    setNotice(null)
    setFormError(null)
    const result = await postEvent(catalog, draft, { now: now(), shared })
    setSubmitting(false)
    if (result.status === 'invalid') {
      setFieldErrors(result.fieldErrors)
      setValidatedFields({
        title: true,
        hostName: true,
        description: true,
        location: true,
        date: true,
        start: true,
        end: true,
      })
      setFormError(result.error)
      return
    }
    if (result.status === 'failed') {
      // Keep everything the user typed so they can retry.
      setFormError(result.error)
      return
    }
    setFieldErrors({})
    setValidatedFields({})
    setNotice(result.message)
    // Keep host name, date and times to make posting a similar event quicker.
    setDraft(current => ({ ...current, title: '', description: '', location: '' }))
    onPosted?.(result.event)
  }

  return (
    <>
      <PostEventFields
        draft={draft}
        fieldErrors={fieldErrors}
        submitting={submitting}
        now={now}
        onSubmit={handleSubmit}
        onChange={update}
        onBlur={validateOnBlur}
      />
      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
    </>
  )
}
