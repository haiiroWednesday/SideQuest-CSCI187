// VIEW: the words beside a day circle. The circle shows the weekday and number ("THU 26", as in M2;
// Cyn, Nov 25), so only Today and Tomorrow are written out beside it. Later days keep their name for
// screen readers but do not show it twice (her Nov 24 rule: a weekday is shown once).
import { shortDay } from './quietContext'

export function QuietDayName({ tag, long }: { tag: string; long: string }) {
  const near = tag === 'TODAY' || tag === 'TOMORROW'
  return <span className={near ? 'sq-quiet-day' : 'sq-quiet-day sq-visually-hidden'}>{shortDay(tag, long)}</span>
}
