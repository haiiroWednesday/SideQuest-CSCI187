import { useId, useState } from 'react'
import { pickedPlace, suggestPlaces, withRoom, type PlaceOption } from '../controller/postPlaces'
import './place-field.css'

/**
 * Where an event is (Nov 27). The host picks a campus place from the map's own list and adds a room, or
 * types any other place. One text value comes out, "Benson, Room 21", so nothing else in the app changes.
 */
export function PlaceField({ id, value, onChange, onBlur, inputProps }: {
  id: string; value: string; onChange: (value: string) => void; onBlur: () => void
  inputProps: Record<string, unknown>
}) {
  const listId = useId()
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const picked = pickedPlace(value)
  const shown = picked ? picked.option.text : value
  const options = focused && !picked ? suggestPlaces(value) : []
  const choose = (option: PlaceOption) => { onChange(withRoom(option, picked?.room ?? '')); setActive(0) }
  const typed = (text: string) => { setActive(0); onChange(picked?.room && text ? `${text}, ${picked.room}` : text) }
  return (
    <div className="sq-place">
      <div className="sq-place-box">
      <input {...inputProps} id={id} type="text" value={shown} required placeholder="Pick a building or type a place"
        role="combobox" aria-expanded={options.length > 0} aria-controls={listId} aria-autocomplete="list" autoComplete="off"
        aria-activedescendant={options[active] ? `${listId}-${options[active].id}` : undefined}
        onChange={e => typed(e.target.value)} onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur() }}
        onKeyDown={e => {
          if (!options.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % options.length) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active + options.length - 1) % options.length) }
          else if (e.key === 'Enter') { e.preventDefault(); choose(options[active]) }
          else if (e.key === 'Escape') setFocused(false)
        }} />
      <ul id={listId} role="listbox" aria-label="Campus places" className="sq-place-list" hidden={!options.length}>
        {options.map((option, index) => (
          <li key={option.id} id={`${listId}-${option.id}`} role="option" aria-selected={index === active}
            onMouseDown={e => { e.preventDefault(); choose(option) }}>
            <b>{option.label}</b>{option.name !== option.label && <span>{option.name}</span>}
          </li>
        ))}
      </ul>
      </div>
      {picked && <div className="sq-place-room">
        <span className="sq-place-ok"><i aria-hidden="true">✓</i>On the campus map</span>
        <label htmlFor={`${id}-room`}><span>ROOM OR FLOOR</span> <small>optional</small></label>
        <input id={`${id}-room`} type="text" value={picked.room} placeholder="Room 104" autoComplete="off"
          onChange={e => onChange(withRoom(picked.option, e.target.value))} />
      </div>}
    </div>
  )
}
