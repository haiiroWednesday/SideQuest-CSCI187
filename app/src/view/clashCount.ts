// VIEW: the number of clashes across upcoming days, for the My Schedule tab's badge.
// App works it out once (from the Schedule controller) and provides it here, so every page's
// header shows the same number without each page passing it along.
import { createContext, useContext } from 'react'

export const ClashCountContext = createContext(0)
export const useClashCount = () => useContext(ClashCountContext)
