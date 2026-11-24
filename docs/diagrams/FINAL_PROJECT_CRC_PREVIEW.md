# Final-project CRC and architecture preview

[Open the two-page editable CRC drawing](FINAL_PROJECT_CRC.drawio) in [diagrams.net](https://app.diagrams.net/) (File → Open From → Device). The drawing keeps the implemented/draft distinction on every responsibility card.

## Working code contracts merged through #82 (November 23), group correction #84 proposed

```mermaid
classDiagram
direction LR
class EventCatalog {
  <<implemented M2>>
  +create(EventDraft)
  +listUpcoming()
  +getById(UUID)
}
class Event {
  <<implemented M2>>
  +uuid id
  +title, host, description
  +date, start, end, location
}
class DiscoverPresenter {
  <<draft PR>>
  +strictFullFit()
  +nearMissExplanation()
  +suggestedCategory()
}
class PersonalSchedule {
  <<implemented M2>>
  +addUniqueEventID()
  +removeEventID()
  +resolveFromCatalog()
  +detectOverlaps()
}
class ScheduleTimeline {
  <<draft PR>>
  +layoutByActualDuration()
  +separateOverlapLanes()
}
class Intention {
  <<draft PR>>
  +localIdeaID
  +title, note, status
  +optionalEventID
  +deferOrRevisit()
}
class CalendarDraft {
  <<draft PR>>
  +CaliforniaTimeToUTC()
  +generateReviewLink()
}
class CampusWalk {
  <<draft foundation>>
  +shortestVerifiedWalk()
  +accessibleOnlyOption()
  +unavailableWithoutSurvey()
}
EventCatalog "1" o-- "0..*" Event : owns public catalog read/write
DiscoverPresenter ..> EventCatalog : reads
PersonalSchedule ..> EventCatalog : resolves event IDs
PersonalSchedule ..> ScheduleTimeline : display only
Intention --> "0..1" Event : optional browser-local ID
CalendarDraft ..> Event : read only
CampusWalk ..> Event : optional venue lookup
```

`EventCatalog`, `PersonalSchedule` and the new modules are conceptual CRC roles implemented by TypeScript functions, interfaces and presenters, rather than one actual class per box. Plans, Someday, group participation and external calendar events have different meanings. Saving an item in Schedule does not RSVP. A Google Calendar link is a draft requiring user review.

## Proposed collaboration boundary, currently without real authentication

```mermaid
classDiagram
direction LR
class GroupPlan {
  <<domain code in draft PR>>
  +id
  +eventId
  +organizerId
  +status
  +revision
  +applyGroupCommand()
}
class Participant {
  <<domain code in draft PR>>
  +userId
  +response: Works|If|Cannot|null
  +privateCondition (optional)
}
class GroupPlanService {
  <<server service code only>>
  +create()
  +get()
  +actWithRevision()
}
class VerifiedServerActor {
  <<not connected yet>>
  +userIdFromRealSession()
}
class GroupPlanRepository {
  <<interface only>>
  +get()
  +create()
  +compareAndSwap()
}
class PendingInvitation {
  <<review-only correction PR 84>>
  +recipientId
  +expiresAt
  +acceptOrDeclineByVerifiedRecipient()
}
GroupPlan "1" *-- "0..12" Participant : membership
GroupPlanService ..> GroupPlan : rule enforcement
GroupPlanService ..> GroupPlanRepository : proposed durable persistence
GroupPlanService ..> VerifiedServerActor : requires actual authentication
GroupPlan "1" *-- "0..12" PendingInvitation : expiring offers
PendingInvitation ..> GroupPlanService : requires consent
GroupPlan --> Event : real eventId
```

**Critical security limitation:** The gated HTTP and Auth code and review-only SQL exist; real provider sessions, deployed storage and actual cross-account authorization remain unverified. PR #84 separates pending invitations from accepted membership; the combined capacity is 12. Accepting is distinct from answering Works. A rule-engine unit test cannot establish that public collaboration is safe. [Detailed security acceptance gates](../GROUP_PLAN_SECURITY_CONTRACT.md).

**Code evidence:** `app/src/model/eventCatalog.ts`, `app/src/model/schedule.ts`, `app/src/model/someday.ts`, `app/src/model/groupPlans.ts`, `app/src/controller/presentDiscover.ts`, `app/src/controller/presentSchedule.ts`, `app/src/controller/calendarExport.ts`, `app/src/model/campusRoutes.ts`, `app/server/groupPlansService.ts`. Core final modules are merged via #82; the new consent correction remains an open review proposal.
