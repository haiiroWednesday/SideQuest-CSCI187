import { useEffect, useState, type FormEvent } from 'react'
import { SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import './group-login.css'

/** A code email takes a while; waiting a minute before resending keeps students under the sender's hourly limit. */
const RESEND_WAIT_SECONDS = 60

export type GroupEmailLoginProps = {
  routes: SideQuestRoutes
  busy: boolean
  error: string | null
  message: string | null
  /** The server's own note after a request. The screen states the next step itself. */
  /** Accounts on: signing in keeps your plans, ideas and busy time, so the words say that. */
  accounts?: boolean
  requestCode: (email: string) => Promise<boolean>
  verifyCode: (email: string, code: string) => Promise<boolean>
  onSuccess: () => void
}

export function GroupEmailLoginView({
  routes, busy, error, message, requestCode, verifyCode, onSuccess, accounts = false,
}: GroupEmailLoginProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  // email: ask for the email. code: the email is on its way, type the code it holds.
  const [step, setStep] = useState<'email' | 'code'>('email')
  // Seconds until another email may be asked for, so a second click can't use up the hourly limit.
  const [wait, setWait] = useState(0)
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait(seconds => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])
  const send = async () => {
    if (await requestCode(email)) {
      setStep('code')
      setWait(RESEND_WAIT_SECONDS)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (step === 'email') {
      await send()
    } else {
      if (await verifyCode(email, code)) {
        setCode('')
        onSuccess()
      }
    }
  }

  return (
    <div className="sq-discover-page sq-group-login-page">
      <SideQuestHeader routes={routes} active="login" />
      <main id="content" className="sq-main">
        <section className="sq-hero" aria-labelledby="sq-login-heading">
          {accounts ? <>
            <h1 id="sq-login-heading">Sign in</h1>
            <p>Your plans, Someday ideas and busy time follow you to any phone or laptop.</p>
          </> : <>
            <h1 id="sq-login-heading">Plan <em>with friends.</em></h1>
            <p>Sign in to coordinate with invited participants. Your personal Someday ideas remain on this device.</p>
          </>}
        </section>
        <form className="sq-login-form" onSubmit={event => { void submit(event) }}>
          <h2>{step === 'email' ? 'Get a sign-in code' : 'Enter the code from your email'}</h2>
          {step === 'code'
            ? <p className="sq-login-sent">We sent a 6-digit code to <strong>{email}</strong>. It can take a minute. Read it on any device.</p>
            : <p>SideQuest keeps your sign-in only in this tab. Closing the tab signs you out.</p>}
          {error && <p role="alert" className="sq-login-error">{error}</p>}
          {message && step === 'email' && !error && <p role="status" className="sq-login-sent">{message}</p>}
          <label htmlFor="sq-login-email">Santa Clara email</label>
          <input id="sq-login-email" type="email" required autoComplete="email"
            value={email} maxLength={254} disabled={busy || step !== 'email'}
            placeholder="you@scu.edu" onChange={event => setEmail(event.target.value)} />
          {step === 'code' && <>
            <label htmlFor="sq-login-code">Verification code</label>
            <input id="sq-login-code" type="text" inputMode="numeric" autoComplete="one-time-code"
              required pattern="[0-9]{6,8}" minLength={6} maxLength={8}
              value={code} disabled={busy} onChange={event => setCode(event.target.value)}
              placeholder="123456" />
          </>}
          <button type="submit" disabled={busy}>
            {busy ? 'Checking…' : step === 'email' ? 'Email me a code' : 'Sign in'}
          </button>
          {step !== 'email' && <div className="sq-login-alternatives">
            <button type="button" disabled={busy} onClick={() => { setStep('email'); setCode('') }}>
              Use another email
            </button>
            <button type="button" disabled={busy || wait > 0} onClick={() => { void send() }}>
              {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
            </button>
          </div>}
          <p className="sq-login-foot">{accounts
            ? 'Only you can see your saved things.'
            : 'Only verified members can read or change a private group plan. Sharing the plan ID alone does not grant access.'}</p>
        </form>
      </main>
      <footer className="sq-footer"><span>SideQuest</span><span>Santa Clara · California</span></footer>
    </div>
  )
}
