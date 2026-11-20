// VIEW: category counts and selection come from the Discover presenter.
// Categories are conservative suggestions until the Event contract gains a
// validated organizer-selected category field.
import type { CategoryFiltersModel } from '../controller/presentScreens'
import type { EventCategorySelection } from '../model/eventCategories'
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
      <div className="sq-category-choices" role="group" aria-label="Filter events by suggested category">
        {categories.options.map(item => (
          <button
            key={item.id}
            type="button"
            className={'sq-category-option' + (categories.selected === item.id ? ' sq-category-option-selected' : '')}
            aria-pressed={categories.selected === item.id}
            onClick={() => onChange(item.id)}
          >
            <span className="sq-category-symbol" aria-hidden="true">{item.symbol}</span>
            <span className="sq-category-name">{item.label}</span>
            <span className="sq-category-number" aria-label={item.count + ' upcoming events'}>{item.count}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
