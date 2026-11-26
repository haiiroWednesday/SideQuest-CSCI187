// VIEW: how the opened card gets the second lines under My day and Walk there. App provides the
// controller's presentOnward bound to the catalog and your plans; the card only draws what it is given.
import { createContext, useContext } from 'react'
import type { OnwardLines } from '../controller/presentOnward'

export const OnwardContext = createContext<((eventId: string) => OnwardLines | null) | null>(null)
export const useOnward = (eventId: string) => useContext(OnwardContext)?.(eventId) ?? null
