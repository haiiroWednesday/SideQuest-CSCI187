# Round 11: photo first, built on what you kept

A redo of round 10. Each option starts from a screen marked Keep or Maybe (G6 shape filters, L1 free-hours board, L2 claw, W12 "Still on?", A7 lens, A8 overlap cards) and puts a real photo inside it. Post, event detail, import, flyers, report, the photo check and the recap use the stamps, tickets, polaroids, tape, pins and red pen from the reference images.

- `o7-photo.part` holds the screens (PK1–PK14 in the review page, P1–P14 in the standalone board). It reuses the round 5 and 6 component library in `tl-design/*.part`.
- `o7-board.part` renders the standalone options board.
- `build-o7.py` builds `opts7.html`. Photos come in as `.ph-<name>` classes from the round 10 CSS, so each image is embedded once.
- `shots/` has a screenshot of each option.

Photos are stand-ins: Cynthia's own and crops of her campus screenshots.
