// VIEW: category counts and selection come from the Discover presenter.
// Categories are conservative suggestions until the Event contract gains a
// validated organizer-selected category field.
import { Icon, isIconName } from './Icon'
import type { CategoryFiltersModel, EventCategorySelection } from '../controller/presentScreens'
import { categoryStyle } from './categoryColors'
import './categories.css'

export function CategoryFilters({ categories, onChange }: {
  categories: CategoryFiltersModel
  onChange: (category: EventCategorySelection) => void
}) {
  return (
    <section className="sq-categories" aria-labelledby="sq-category-heading">
      <div className="sq-categories-intro">
        <h2 id="sq-category-heading">What sounds good?</h2>
        <p>Suggested groups based on event titles and organizers. Events without a clear match appear in Other.</p>
      </div>
      <div className="sq-category-choices" role="group" aria-label="Filter events by suggested category, choose one or more">
        {categories.options.map(item => {
          // several can be on at once; "All activities" is on when none is chosen
          const on = item.id === 'all' ? categories.chosen.length === 0 : categories.chosen.includes(item.id)
          return (
          <button
            key={item.id}
            type="button"
            className={'sq-category-option' + (on ? ' sq-category-option-selected' : '')}
            aria-pressed={on}
            onClick={() => onChange(item.id)}
            style={categoryStyle(item.id)}
          >
            <span className="sq-category-symbol" aria-hidden="true">
              <svg className="sq-category-dab" viewBox="0 0 40 40"><path d="M20 3C29 2 37 9 37 19S30 37 20 37 3 31 4 20 11 4 20 3Z" /></svg>
              {isIconName(item.id) ? <Icon name={item.id} /> : item.symbol}
            </span>
            <span className="sq-category-name">{item.label}</span>
            <span className="sq-category-number" aria-label={item.count + ' upcoming events'}>{item.count}</span>
          </button>
          )
        })}
      </div>
    </section>
  )
}
