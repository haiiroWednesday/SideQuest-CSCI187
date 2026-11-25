import { useState, type FormEvent } from 'react'
import { SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import './group-login.css'

export type GroupEmailLoginProps = {
  routes: SideQuestRoutes
  busy: boolean
  error: string | null
  message: string | null
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
  // email: ask for the email. sent: the email is on its way, tap its link. code: type a code instead.
  const [step, setStep] = useState<'email' | 'sent' | 'code'>('email')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (step === 'email') {
      if (await requestCode(email)) setStep('sent')
    } else if (step === 'code') {
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
          <h2>{step === 'email' ? 'Get a sign-in email' : step === 'sent' ? 'Check your email and tap the link' : 'Enter your email code'}</h2>
          {step === 'sent'
            ? <p className="sq-login-sent">We sent a link to <strong>{email}</strong>. It opens SideQuest signed in.</p>
            : <p>For account security, SideQuest keeps your sign-in only in this tab's memory. Reloading or closing this tab ends your session, and you'll need a new email.</p>}
          {error && <p role="alert" className="sq-login-error">{error}</p>}
          {message && step !== 'sent' && <p role="status" className="sq-login-status">{message}</p>}
          <label htmlFor="sq-login-email">Santa Clara email</label>
          <input id="sq-login-email" type="email" required autoComplete="email"
            value={email} maxLength={254} disabled={busy || step !== 'email'}
            placeholder="you@scu.edu" onChange={event => setEmail(event.target.value)} />
          {step === 'code' && <>
            <label htmlFor="sq-login-code">Verification code</label>
            <input id="sq-login-code" type="text" inputMode="numeric" autoComplete="one-time-code"
              required pattern="[0-9]{6,8}" minLength={6} maxLength={8}
              value={code} disabled={busy} onChange={event => setCode(event.target.value)}
              placeholder="6 or 8 digits" />
          </>}
          {step !== 'sent' && <button type="submit" disabled={busy}>
            {busy ? 'Checking…' : step === 'email' ? 'Email me a sign-in link' : 'Verify and continue'}
          </button>}
          {step !== 'email' && <div className="sq-login-alternatives">
            {step === 'sent' && <button type="button" disabled={busy} onClick={() => setStep('code')}>
              Have a code instead?
            </button>}
            <button type="button" disabled={busy} onClick={() => { setStep('email'); setCode('') }}>
              Use another email
            </button>
            <button type="button" disabled={busy} onClick={() => { void requestCode(email) }}>
              Send another email
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
