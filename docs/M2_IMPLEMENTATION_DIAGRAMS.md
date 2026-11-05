# SideQuest M2 Part 1: Updated CRC and ER diagrams

**Current editable diagrams, November 4, 2026.** These are the M2 Part 1 diagrams for Professor Kandel. They use the **same visual notations as our earlier P4 CRC and P5 ER coursework** and are updated from the implemented MVP code. The earlier generated architecture-summary boxes were incorrect as submission diagrams and have been replaced.

## Open the correct files

| Required deliverable | **Open visually in diagrams.net** | GitHub source on `master` | Editable SCU Drive copy |
| --- | --- | --- | --- |
| **CRC / UML responsibility diagram** (2 pages) | [Open CRC drawing](https://app.diagrams.net/?mode=github#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_CRC.drawio) | [M2_CRC.drawio](diagrams/M2_CRC.drawio) | [Open Drive copy](https://app.diagrams.net/?mode=google#G1EQOXQXHnbeXry1-HULe60I2nKLw_gMR-) |
| **Chen-style ER diagram** (1 page) | [Open ER drawing](https://app.diagrams.net/?mode=github#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_STORAGE_ER.drawio) | [M2_STORAGE_ER.drawio](diagrams/M2_STORAGE_ER.drawio) | [Open Drive copy](https://app.diagrams.net/?mode=google#G1gIQn3a0d6uCOkaqzQsg2r29I_IUkml-e) |
| **Both diagrams together** (3 pages) | [Open combined drawing](https://app.diagrams.net/?mode=github#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_IMPLEMENTATION.drawio) | [M2_IMPLEMENTATION.drawio](diagrams/M2_IMPLEMENTATION.drawio) | [Open Drive copy](https://app.diagrams.net/?mode=google#G1wQLEXbd-ihUsXFL3SV3qvAgtvtPovKgZ) |

**Why these links differ:** GitHub's `.drawio` pages display the underlying XML, which is normal. The **Open visually** links load the same `master` files in [diagrams.net](https://app.diagrams.net/) using its GitHub integration. Sign into GitHub and authorize the editor if prompted; the repository is private. If you cannot authorize GitHub, use the SCU Drive editor copies with an account that has permission, or select **Download raw file** on GitHub and then **File → Open From → Device** in diagrams.net. GitHub and Drive copies are separate and do not synchronize automatically.

[Open the shared M2 folder](https://drive.google.com/drive/folders/1Nr67cdT8tEKPWBe9j3LNm6Wzw6alGgPc). The old `M2_CRC.svg` and `M2_STORAGE.svg` snapshots were removed because they represented the superseded overview; use the editor links above for the current course-format drawings.

**Instructor access:** GitHub user `jkandel-scu` has verified **write** collaborator access to the private repository, so the professor can inspect the files directly on `master`. The Drive copies grant access to signed-in SCU-domain accounts; they are not anonymous public links. Updating these files does not itself establish that Camino received a submission.

## CRC: what changed and why

The CRC page retains the P4-style **EventCatalog, Event, Schedule** responsibility cards and three UML links, with a second page explaining those links. The card text now matches M2, including:

- **EventCatalog:** create validated public Events, list upcoming Events, retrieve any Event by UUID, and delegate persistence to an EventTable adapter.
- **Event:** ID, title, host, description, location and California campus date/times; required-field limits, non-past posting, same-day ordering, and entire-event free-time fit.
- **Schedule:** stores unique planned Event IDs in the **current browser**, with a provisional 100-ID cap; resolves details by catalog lookup, sorts events, warns of overlaps, and preserves IDs during failed lookups.

The hollow diamonds express independent Event lifetime: deleting a local plan does not delete its public Event. The dashed dependency represents catalog lookup; the production **sharedSchedule Controller** mediates that call. These are conceptual CRC responsibilities implemented through TypeScript types/functions/ports, rather than three literal instantiated classes. See `app/src/model/eventCatalog.ts`, `events.ts`, `schedule.ts` and `app/src/controller/sharedSchedule.ts`.

## ER: what changed and why

The ER page uses the **P5 Chen notation**: a rectangular EVENT entity, oval SQL attributes, an emphasized PK oval, and a dashed client lookup relationship. It matches the checked migration at `supabase/migrations/20261103000000_create_events.sql`:

| Shared SQL entity | Attributes |
| --- | --- |
| `public.events` | `id` (UUID primary key), `title`, `host_name`, `description`, `location`, `event_date`, `start_time`, `end_time`, `created_at` |

This is currently **one SQL entity**, so there is no SQL attendance relationship or inter-table foreign key to invent. The device-local JSON ID list (`sidequest.planned-event-ids.v1`) is shown **separately and explicitly outside SQL**; its dashed ID lookup is a client-side reference, not an enforced FK. Search availability is temporary View state. The earlier P5's USER and AVAILABILITY_WINDOW entities are not current database tables; `host_name` is self-reported, and users have no accounts.

SQL migration includes bounded anonymous INSERT, anonymous SELECT, and no anonymous UPDATE/DELETE. The migration is committed, but **live Supabase deployment and an independent two-browser sharing test are still unverified**.

## Scope and remaining checks

- **M2 Part 1:** [original assignment](https://docs.google.com/document/d/1_LlAb9mtASfutgVjKdjjt7Esh7g0ab6J4FmCzREJDEU/edit) calls for **updated CRC and ER** alongside code, tests, README, REQUIREMENTS and SPECIFICATIONS. This repository now links both corrected editable files from those grading documents.
- **P4 and P5 historical submissions:** [approved P4 CRC](https://drive.google.com/file/d/1xiZGXQeScuJx14yKNUcwj1XtWTfOb-l4/view) and [selected P5 conceptual ER](https://drive.google.com/file/d/1gzbESV0y6hdACNoPJeH3hnO1zxFQ54Lv/view) remain untouched. Their broader designs must not be misreported as implemented SQL.
- **M2 Part 2 (November 9):** [final project plan assignment](https://docs.google.com/document/d/1qIx_8k4ZOGWPrISXNYXf-sOifYsXk3SWoPVkoOBP3es/edit) separately asks for **full-final-project CRC/ER diagrams**, which must reflect a team-approved final feature scope. These current MVP diagrams do not by themselves complete that future-planning requirement.
- **Human checks:** confirm Camino M2 Part 1 submission; review diagram accuracy with teammates; verify hosted database permissions and posting across two independent browsers.

See the [repository README](../README.md), [requirements](../REQUIREMENTS.md), [specifications](../SPECIFICATIONS.md), and [M2 handoff on review branch #24](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/24) for related code/tests and outstanding acceptance.
