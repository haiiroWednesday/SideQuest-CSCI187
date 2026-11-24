import { useState, type FormEvent } from 'react'
import { SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import './group-login.css'

export type GroupEmailLoginProps = {
  routes: SideQuestRoutes
  busy: boolean
  error: string | null
  message: string | null
  requestCode: (email: string) => Promise<boolean>
  verifyCode: (email: string, code: string) => Promise<boolean>
  onSuccess: () => void
}

export function GroupEmailLoginView({
  routes, busy, error, message, requestCode, verifyCode, onSuccess,
}: GroupEmailLoginProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (step === 'email') {
      if (await requestCode(email)) setStep('code')
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
          <h1 id="sq-login-heading">Plan <em>with friends.</em></h1>
          <p>Sign in to coordinate with invited participants. Your personal Someday ideas remain on this device.</p>
        </section>
        <form className="sq-login-form" onSubmit={event => { void submit(event) }}>
          <h2>{step === 'email' ? 'Get an email sign-in code' : 'Enter your email code'}</h2>
          <p>For account security, SideQuest keeps the access token only in this tab's memory. Reloading or closing this tab discards its token, and you'll need another code. Use End session to revoke the current server session.</p>
          {error && <p role="alert" className="sq-login-error">{error}</p>}
          {message && <p role="status" className="sq-login-status">{message}</p>}
          <label htmlFor="sq-login-email">Email address</label>
          <input id="sq-login-email" type="email" required autoComplete="email"
            value={email} maxLength={254} disabled={busy || step === 'code'}
            placeholder="student@example.edu" onChange={event => setEmail(event.target.value)} />
          {step === 'code' && <>
            <label htmlFor="sq-login-code">Verification code</label>
            <input id="sq-login-code" type="text" inputMode="numeric" autoComplete="one-time-code"
              required pattern="[0-9]{6,8}" minLength={6} maxLength={8}
              value={code} disabled={busy} onChange={event => setCode(event.target.value)}
              placeholder="6 or 8 digits" />
          </>}
          <button type="submit" disabled={busy}>
            {busy ? 'Checking…' : step === 'email' ? 'Send sign-in code' : 'Verify and continue'}
          </button>
          {step === 'code' && <div className="sq-login-alternatives">
            <button type="button" disabled={busy} onClick={() => { setStep('email'); setCode('') }}>
              Use another email
            </button>
            <button type="button" disabled={busy} onClick={() => { void requestCode(email) }}>
              Request another code
            </button>
          </div>}
          <p className="sq-login-foot">Only verified members can read or change a private group plan. Sharing the plan ID alone does not grant access.</p>
        </form>
      </main>
      <footer className="sq-footer"><span>SideQuest</span><span>Santa Clara · California</span></footer>
    </div>
  )
}
