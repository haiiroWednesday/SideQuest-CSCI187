#!/bin/bash
# Refresh "SideQuest flow and demo" after a UI change:
#   1. rebuild the review build and the artifact site, 2. check every case, 3. retake every screenshot,
#   4. redraw the chart. Then publish site/ to artifact 59086d8a-926e-4464-aefd-9b324dcd8db1 (changed files only)
#   and the review site to bce5f071-2b8a-42fe-9a7d-30fa477337d7.
# Flows, repeats (C1..), talk outline and Q&A are the arrays at the bottom of site/index.html: edit them by hand.
set -e
timeout 200 bash /home/claude/taste/rebuild.sh > /tmp/rb.log 2>&1 || true
timeout 60 bash /home/claude/taste/assemble-site.sh
cd /home/claude/artifact-app && rm -rf site.prev && mv site site.prev && mv site.new site
pkill -f "m http.serve[r] 5410" || true; sleep 1
(cd site && setsid nohup python3 -m http.server 5410 >/dev/null 2>&1 < /dev/null &); sleep 1
(cd /home/claude/taste && node allcases.mjs | tail -3)
cd /home/claude/flow && rm -f shots/*.png && node cap.mjs && node focus.mjs
python3 - <<'P'
from PIL import Image
import glob,os
for f in glob.glob('/home/claude/flow/shots/*.png'):
    Image.open(f).save('/home/claude/flow/site/shots/'+os.path.basename(f)[:-4]+'.webp',quality=82)
P
node render.mjs
ls /home/claude/artifact-app/site/assets | grep -E "^demo-|^DesignReview-"
