// VIEW: the pieces that turn Discover into steps (Nov 27, D6): the step bar and the Next button at the
// foot of a step. The steps and their addresses come from controller/discoverSteps.ts.
import { DISCOVER_STEPS, type DiscoverStep } from '../controller/discoverSteps'
import './steps.css'

export function DiscoverStepper({ step }: { step: DiscoverStep }) {
  const at = DISCOVER_STEPS.findIndex(s => s.step === step)
  return (
    <nav className="sq-steps" aria-label="Discover steps">
      <ol>
        {DISCOVER_STEPS.map((s, i) => (
          <li key={s.step} className={i < at ? 'sq-step-done' : undefined}>
            <a href={s.route} aria-current={s.step === step ? 'step' : undefined}>
              {/* The number is drawn by CSS, so the link's name is its words: "Discover: When". */}
              <span className="sq-visually-hidden">Discover: </span>{s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function StepNext({ label, onNext, skip }: { label: string; onNext: () => void; skip?: { label: string; onSkip: () => void } }) {
  return (
    <div className="sq-step-next">
      <button type="button" className="sq-plan-button sq-step-go" onClick={onNext}>{label}</button>
      {skip && <button type="button" className="sq-text-button sq-step-skip" onClick={skip.onSkip}>{skip.label}</button>}
    </div>
  )
}
