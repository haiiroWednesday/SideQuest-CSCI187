# SideQuest M2 Part 1: Updated CRC and ER diagrams

**Current editable diagrams, November 4, 2026.** These M2 diagrams use the visual conventions of the accepted P4 CRC and the P5 ER, updated to match the implemented MVP. Earlier overview-only drawings were superseded.

## Open the correct files

**For reliable viewing, use the GitHub-native previews below.** They render directly on GitHub without asking diagrams.net to connect to the private repository.

| Required deliverable | **View immediately on GitHub** | Editable original on `master` | Editable SCU Drive copy |
| --- | --- | --- | --- |
| **CRC / UML responsibility diagram** (2-page original) | **[View CRC preview](diagrams/M2_CRC_PREVIEW.md)** | [M2_CRC.drawio](diagrams/M2_CRC.drawio) | [Drive copy](https://app.diagrams.net/?mode=google#G1EQOXQXHnbeXry1-HULe60I2nKLw_gMR-) |
| **Chen-style ER diagram** (1-page original) | **[View ER preview](diagrams/M2_ER_PREVIEW.md)** | [M2_STORAGE_ER.drawio](diagrams/M2_STORAGE_ER.drawio) | [Drive copy](https://app.diagrams.net/?mode=google#G1gIQn3a0d6uCOkaqzQsg2r29I_IUkml-e) |
| **Both editable diagrams together** (3 pages) | [CRC preview](diagrams/M2_CRC_PREVIEW.md) + [ER preview](diagrams/M2_ER_PREVIEW.md) | [M2_IMPLEMENTATION.drawio](diagrams/M2_IMPLEMENTATION.drawio) | [Drive copy](https://app.diagrams.net/?mode=google#G1wQLEXbd-ihUsXFL3SV3qvAgtvtPovKgZ) |

The previews are GitHub Mermaid representations of the main classes, relationships and stored fields. They are **not pixel-identical exports** of the original two-page CRC and Chen-style ER drawings. For the exact course-format diagrams, download the `.drawio` file from GitHub (Raw / Download raw file) and in [diagrams.net](https://app.diagrams.net/) choose **File → Open From → Device**. This works without diagrams.net's GitHub connector, which can time out on private repositories.

[Open the shared M2 Drive folder](https://drive.google.com/drive/folders/1Nr67cdT8tEKPWBe9j3LNm6Wzw6alGgPc). The older `M2_CRC.svg` and `M2_STORAGE.svg` snapshots represented a superseded overview and were removed. GitHub and Drive diagrams are separate copies and are not synchronized. Repository changes do not establish course-portal submission status.

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
- **M2 Part 2 (November 11):** [final project plan assignment](https://docs.google.com/document/d/1qIx_8k4ZOGWPrISXNYXf-sOifYsXk3SWoPVkoOBP3es/edit) separately asks for **full-final-project CRC/ER diagrams**, which must reflect a team-approved final feature scope. These current MVP diagrams do not by themselves complete that future-planning requirement.
- **Human checks:** confirm Camino M2 Part 1 submission; review diagram accuracy with teammates; verify hosted database permissions and posting across two independent browsers.

See the [repository README](../README.md), [requirements](../REQUIREMENTS.md), [specifications](../SPECIFICATIONS.md), and [integration verification](M2_INTEGRATION_VERIFICATION.md) for related code/tests and outstanding acceptance. PR #24 was closed after its functional changes had already been incorporated through PR #26.
