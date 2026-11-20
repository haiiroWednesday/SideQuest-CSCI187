// Public presenter API retained for current screens and existing consumers.
// Implementation is split by responsibility: shared formatting, Discover and Schedule.
export { splitTime, spanText, describeDay, presentBrowseDetail } from './screenModels'
export type { ScreenEvent, FreeWindow, TimeParts, StubModel, DayModel, FreeWindowModel, DiscoverScreen, CategoryFiltersModel } from './screenModels'
export type { EventCategorySelection } from '../model/eventCategories'
export { presentDiscover } from './presentDiscover'
export { presentSchedule } from './presentSchedule'
export type { ScheduleInput, PlanStubModel, NextUpModel, ScheduleScreen } from './presentSchedule'
