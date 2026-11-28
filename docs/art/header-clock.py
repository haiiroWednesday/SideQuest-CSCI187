import math
G='#e8aa24'
def P(x,y): return f'{x:.2f} {y:.2f}'
def rot(pts,a,cx=100,cy=100):
    c,s=math.cos(a),math.sin(a)
    return [(cx+(x)*c-(y)*s, cy+(x)*s+(y)*c) for x,y in pts]
def poly(pts): return 'M'+'L'.join(P(*p) for p in pts)+'Z'
# --- Roman glyphs, drawn in a box centred on 0,0, height H, thick/thin contrast like an engraved dial ---
H=11.0; T=2.1; t=.75; SW=1.05  # stem thick, hairline, serif half-width extra
def bar(x0,x1,y0,y1): return [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]
def I(x):
    return [bar(x-T/2,x+T/2,-H/2,H/2), bar(x-T/2-SW,x+T/2+SW,-H/2,-H/2+t), bar(x-T/2-SW,x+T/2+SW,H/2-t,H/2)]
def V(x):
    w=7.2
    top=-H/2; bot=H/2
    thick=[(x-w/2,top),(x-w/2+T*1.15,top),(x+T*.35,bot),(x-T*.55,bot)]
    thin=[(x+w/2-t*1.1,top),(x+w/2,top),(x+T*.35,bot),(x+T*.35-t*1.3,bot)]
    serif=[bar(x-w/2-SW*.6,x-w/2+T*1.15+SW*.6,top,top+t), bar(x+w/2-t*1.1-SW*.8,x+w/2+SW*.6,top,top+t)]
    return [thick,thin]+serif
def X(x):
    w=7.6; top=-H/2; bot=H/2
    thick=[(x-w/2,top),(x-w/2+T*1.15,top),(x+w/2,bot),(x+w/2-T*1.15,bot)]
    thin=[(x+w/2-t*1.2,top),(x+w/2,top),(x-w/2+t*1.2,bot),(x-w/2,bot)]
    serif=[bar(x-w/2-SW*.5,x-w/2+T*1.15+SW*.3,top,top+t), bar(x+w/2-t*1.2-SW*.6,x+w/2+SW*.5,top,top+t),
           bar(x-w/2-SW*.5,x-w/2+t*1.2+SW*.6,bot-t,bot), bar(x+w/2-T*1.15-SW*.3,x+w/2+SW*.5,bot-t,bot)]
    return [thick,thin]+serif
ADV={'I':T+2*SW+.9,'V':7.2+1.6,'X':7.6+1.6}
F={'I':I,'V':V,'X':X}
def numeral(s):
    widths=[ADV[c] for c in s]; total=sum(widths); x=-total/2; out=[]
    for c,w in zip(s,widths): out+=F[c](x+w/2); x+=w
    return out
ROM=['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI']
def svg(clip=False):
    o=[f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='-10 -10 220 220'>"]
    R=11.5
    dia=lambda cx,cy,r: f"M{cx} {cy-r}L{cx+r} {cy}L{cx} {cy+r}L{cx-r} {cy}Z"
    o.append("<defs><mask id='m' maskUnits='userSpaceOnUse' x='-10' y='-10' width='220' height='220'><rect x='-10' y='-10' width='220' height='220' fill='white'/>"
             f"<path d='{dia(3,100,R+1.6)} {dia(197,100,R+1.6)}' fill='black'/></mask></defs><g mask='url(#m)'>")
    o.append(f"<g fill='none' stroke='{G}'>")
    o.append(f"<circle cx='100' cy='100' r='97' stroke-width='1.3'/>")
    o.append(f"<circle cx='100' cy='100' r='93.2' stroke-width='.55'/>")
    o.append(f"<circle cx='100' cy='100' r='80.5' stroke-width='.55'/>")
    o.append(f"<circle cx='100' cy='100' r='65.5' stroke-width='1'/>")
    # lace band: a running scallop between the numeral ring and the rim
    sc=[]
    N=48; r=84.6; amp=3.4
    for k in range(N):
        a0=math.radians(k*360/N); a1=math.radians((k+1)*360/N); am=(a0+a1)/2
        x0,y0=100+r*math.sin(a0),100-r*math.cos(a0); x1,y1=100+r*math.sin(a1),100-r*math.cos(a1)
        xc,yc=100+(r+amp*2)*math.sin(am),100-(r+amp*2)*math.cos(am)
        sc.append(f"M{P(x0,y0)}Q{P(xc,yc)} {P(x1,y1)}")
    o.append(f"<path d='{''.join(sc)}' stroke-width='.6'/>")
    o.append(f"<circle cx='100' cy='100' r='62' stroke-width='.5'/>")
    # minute track
    ticks=[]
    for m in range(60):
        a=math.radians(m*6)
        r0=62; r1=58.4 if m%5 else 55.5
        w=.55 if m%5 else 1.2
        x0,y0=100+r0*math.sin(a),100-r0*math.cos(a); x1,y1=100+r1*math.sin(a),100-r1*math.cos(a)
        ticks.append(f"<path d='M{P(x0,y0)}L{P(x1,y1)}' stroke-width='{w}'/>")
    o+=ticks
    o.append("</g>")
    o.append(f"<g fill='{G}'>")
    # bead ring between the outer lines
    for k in range(72):
        a=math.radians(k*5+2.5); r=95.1
        rr=.95 if k%6 else 1.35
        o.append(f"<circle cx='{100+r*math.sin(a):.2f}' cy='{100-r*math.cos(a):.2f}' r='{rr}'/>")
    # numerals, radial, foot toward the centre
    for i,s in enumerate(ROM):
        a=math.radians(i*30)
        for pts in numeral(s):
            pts=[(x, y-87+H/2+0.0-6.5) for x,y in pts]  # place band centre at r=87-... (y negative is outward)
            # move so glyph centre sits at radius 73
            pts=[(x, y+ (87+6.5-H/2) - 73) for x,y in pts]
            o.append(f"<path d='{poly(rot(pts,a))}'/>")
    # a dot in each scallop
    for k in range(48):
        a=math.radians((k+.5)*7.5); r=89.3
        o.append(f"<circle cx='{100+r*math.sin(a):.2f}' cy='{100-r*math.cos(a):.2f}' r='.62'/>")
    # small lozenges between numerals on the numeral band
    for i in range(12):
        a=math.radians(i*30+15); r=73
        d=[(0,-2.3),(1.1,0),(0,2.3),(-1.1,0)]
        o.append(f"<path d='{poly(rot(d,a))}' transform='translate({r*math.sin(a):.2f} {-r*math.cos(a):.2f})'/>")
    # inner rosette: twelve slim petals
    for i in range(12):
        a=math.radians(i*30)
        petal=[]
        for k in range(21):
            u=k/20; y=-(30+20*u); x=2.6*math.sin(math.pi*u)
            petal.append((x,y))
        for k in range(20,-1,-1):
            u=k/20; y=-(30+20*u); x=-2.6*math.sin(math.pi*u)
            petal.append((x,y))
        o.append(f"<path d='{poly(rot(petal,a))}' fill-opacity='.55'/>")
    # centre: eight-point star and boss
    star=[]
    for k in range(16):
        a=math.radians(k*22.5); r=22 if k%4==0 else (12 if k%2==0 else 5.2)
        star.append((100+r*math.sin(a),100-r*math.cos(a)))
    o.append(f"<path d='{poly(star)}' fill-opacity='.8'/>")
    o.append("<circle cx='100' cy='100' r='3.4'/>")
    # medallions at 3 and 9: diamonds over the rim, crescent and star inside
    o.append("</g></g><g fill='"+G+"'>")
    for kind,cx in (('star',197.0),('moon',3.0)):
        cy=100
        # solid gold diamond with the moon or star cut out (transparent, evenodd), nothing of the dial beneath
        if kind=='moon':
            import math as m
            # A round moon: the whole crescent sits on one circle, centred in the diamond. The bite is small and
            # set far to one side, so the two tips nearly meet.
            x1,y1,r1=cx,cy,5.0
            x2,y2,r2=cx+2.55,cy-1.15,3.75
            d=m.hypot(x2-x1,y2-y1); a=(r1*r1-r2*r2+d*d)/(2*d); h=m.sqrt(r1*r1-a*a)
            px,py=x1+a*(x2-x1)/d, y1+a*(y2-y1)/d
            ux,uy=-(y2-y1)/d,(x2-x1)/d
            P1=(px+h*ux,py+h*uy); P2=(px-h*ux,py-h*uy)
            hole=(f"M{P1[0]:.2f} {P1[1]:.2f}A{r1} {r1} 0 1 1 {P2[0]:.2f} {P2[1]:.2f}"
                  f"A{r2} {r2} 0 1 0 {P1[0]:.2f} {P1[1]:.2f}Z")
        else:
            import math as m
            pts=[]
            for k in range(8):
                a=m.radians(k*45); r=6.6 if k%2==0 else 2.1
                pts.append((cx+r*m.sin(a),cy-r*m.cos(a)))
            hole="M"+"L".join(f"{x:.2f} {y:.2f}" for x,y in pts)+"Z"
        o.append(f"<path d='{dia(cx,cy,R)} {hole}' fill-rule='evenodd'/>")
    o.append("</g>")
    o.append("</svg>")
    return ''.join(o)
open('clock.svg','w').write(svg())
