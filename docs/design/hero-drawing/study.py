import sys, math
sys.path.insert(0, sys.path[0])
from pen import Pen
import flowers as F
P = Pen(seed=5, ink='#8e6552'); P.minpts = 9
F.rose_leaf(P, 70, 230, 70, -.4)
F.rose(P, 150, 150, 80, rot=.3)
F.rose(P, 300, 160, 40, rot=2)
F.rose(P, 370, 200, 20)
F.rose(P, 410, 220, 10)
F.rose_small(P, 440, 230, 6)
F.rose_bud(P, 260, 90, 12, ang=.3)
for i,(x,y,r) in enumerate([(520,90,30),(590,110,22),(560,160,16),(620,170,10),(650,190,6),(670,200,3)]):
    F.begonia(P, x, y, r, rot=.2*i-.3)
F.begonia_leaf(P, 500, 180, 50, .3)
F.raceme(P, 760, 30, 220, s0=11, sway=10)
F.raceme(P, 830, 40, 160, s0=8, sway=-8)
F.raceme(P, 880, 40, 110, s0=5)
F.wis_leaf(P, 690, 40, 70, .4)
open('art/study.svg','w').write(P.svg(940, 300))
