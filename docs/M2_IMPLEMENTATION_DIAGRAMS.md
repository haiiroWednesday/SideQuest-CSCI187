# SideQuest M2 Part 1: Updated CRC and ER diagrams

**Current editable diagrams, November 4, 2026.** These are the M2 Part 1 diagrams for Professor Kandel. They use the **same visual notations as our earlier P4 CRC and P5 ER coursework** and are updated from the implemented MVP code. The earlier generated architecture-summary boxes were incorrect as submission diagrams and have been replaced.

## Open the correct files

| Required deliverable | Open visually in diagrams.net (GitHub access) | GitHub source / download | Editable team Drive copy |
| --- | --- | --- | --- |
| **CRC / UML responsibility diagram** (two pages) | [**Open CRC in diagram editor**](https://app.diagrams.net/#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_CRC.drawio) | [M2_CRC.drawio](diagrams/M2_CRC.drawio) | [SideQuest_M2_CRC.drawio](https://drive.google.com/file/d/1EQOXQXHnbeXry1-HULe60I2nKLw_gMR-/view) |
| **Chen-style ER diagram** (one page) | [**Open ER in diagram editor**](https://app.diagrams.net/#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_STORAGE_ER.drawio) | [M2_STORAGE_ER.drawio](diagrams/M2_STORAGE_ER.drawio) | [SideQuest_M2_STORAGE_ER.drawio](https://drive.google.com/file/d/1gIQn3a0d6uCOkaqzQsg2r29I_IUkml-e/view) |
| **Both diagrams together** (three pages) | [**Open combined diagram**](https://app.diagrams.net/#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_IMPLEMENTATION.drawio) | [M2_IMPLEMENTATION.drawio](diagrams/M2_IMPLEMENTATION.drawio) | [Combined Draw.io file](https://drive.google.com/file/d/1wQLEXbd-ihUsXFL3SV3qvAgtvtPovKgZ/view) |

**Why GitHub looks strange:** GitHub's source and **Raw** links show the diagram's XML (`<mxfile>`, `<mxGraphModel>`, `<mxCell>`), not a graphical view. That XML is the editable `.drawio` format.

**Opening the graphical diagram:** the first column of links opens [diagrams.net](https://app.diagrams.net/) with the correct `master` file selected through its GitHub integration. Because this repository is private, the editor may ask you to sign in and authorize GitHub access before the diagram appears. **Fallback without third-party GitHub authorization:** use the GitHub source link while signed in, click **Download raw file**, and at diagrams.net choose **File → Open From → Device** to open the downloaded file. You can also use the [shared M2 Drive folder](https://drive.google.com/drive/folders/1Nr67cdT8tEKPWBe9j3LNm6Wzw6alGgPc) if your Google account has access, then open a copy with diagrams.net. Viewing does not require saving any edits.

Older `M2_CRC.svg` and `M2_STORAGE.svg` snapshots were removed because they represented the superseded overview. Use the course-format editable `.drawio` files above for M2 review.

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
