// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { pickedPlace, suggestPlaces, withRoom } from '../src/controller/postPlaces'
import { placeLabelFor } from '../src/model/walkEstimate'
import { PlaceField } from '../src/view/PlaceField'

afterEach(cleanup)

describe('campus places a host can pick', () => {
  it('offers well-used places before anything is typed, and matches on any name a place goes by', () => {
    expect(suggestPlaces('').map(place => place.label)).toEqual(['Benson', 'Library', 'SCDI', 'Locatelli', 'Mission Gardens'])
    expect(suggestPlaces('ben')[0].label).toBe('Benson')
    expect(suggestPlaces('mission').map(place => place.label)).toContain('Mission Gardens')
    expect(suggestPlaces('zzzz')).toEqual([])
    expect(suggestPlaces('a', 3)).toHaveLength(3)
  })

  it('writes text the map reads back as the same place, with or without a room', () => {
    for (const place of suggestPlaces('', 5).concat(suggestPlaces('dowd'), suggestPlaces('swig'), suggestPlaces('finn'))) {
      expect(placeLabelFor(place.text)).toBe(place.label)
      expect(placeLabelFor(withRoom(place, 'Room 104'))).toBe(place.label)
    }
  })

  it('splits a location back into the place and its room, and leaves other text alone', () => {
    const benson = suggestPlaces('benson')[0]
    expect(pickedPlace(withRoom(benson, 'Room 21'))).toEqual({ option: benson, room: 'Room 21' })
    expect(pickedPlace(benson.text)).toEqual({ option: benson, room: '' })
    expect(withRoom(benson, '   ')).toBe(benson.text)
    expect(pickedPlace('Bensonhurst cafe')).toBeNull()
    expect(pickedPlace('My apartment on Lafayette')).toBeNull()
  })
})

describe('the place field on the post form', () => {
  function Harness() {
    const [value, setValue] = useState('')
    return <><label htmlFor="post-location">Location</label>
      <PlaceField id="post-location" value={value} onChange={setValue} onBlur={() => {}} inputProps={{}} /><output>{value}</output></>
  }
  const field = () => screen.getByRole('combobox', { name: 'Location' }) as HTMLInputElement

  it('pick a building, then add a room: one location comes out', () => {
    const { container } = render(<Harness />)
    fireEvent.focus(field())
    fireEvent.change(field(), { target: { value: 'ben' } })
    fireEvent.mouseDown(screen.getByRole('option', { name: /^Benson/ }))
    expect(container.querySelector('output')!.textContent).toBe('Benson')
    expect(screen.getByText('On the campus map')).toBeTruthy()
    expect(screen.queryByRole('option')).toBeNull()
    fireEvent.change(screen.getByLabelText(/ROOM OR FLOOR/), { target: { value: 'Room 21' } })
    expect(container.querySelector('output')!.textContent).toBe('Benson, Room 21')
    expect(field().value).toBe('Benson')
  })

  it('works from the keyboard, and any other place can still be typed', () => {
    const { container } = render(<Harness />)
    fireEvent.focus(field())
    fireEvent.change(field(), { target: { value: 'lib' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(container.querySelector('output')!.textContent).toBe('Library')
    fireEvent.change(field(), { target: { value: 'Taqueria on The Alameda' } })
    expect(container.querySelector('output')!.textContent).toBe('Taqueria on The Alameda')
    expect(screen.queryByText('On the campus map')).toBeNull()
  })
})
