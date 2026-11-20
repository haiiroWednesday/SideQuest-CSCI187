import numpy as np, sys, json
from PIL import Image
from scipy import ndimage as ndi
D='/home/claude/b3d/out4/'
IDC={'body':(1,0,0),'head':(0,1,0),'cheek':(0,1,1),'wing':(0,0,1),'wingtip':(1,0,1),'tail':(1,1,0),'beak':(1,1,1),'leg':(.5,.5,.5),'eye':(.5,0,0)}
PARTS=list(IDC)
def L(n): return np.asarray(Image.open(D+n).convert('RGBA'),dtype=np.float32)/255
def hexc(h): return np.array([int(h[i:i+2],16)/255 for i in (1,3,5)],dtype=np.float32)
def ss(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
_cache={}
def passes(pose):
    if pose in _cache: return _cache[pose]
    idp,n,p,s=L(pose+'_id.png'),L(pose+'_n.png'),L(pose+'_p.png'),L(pose+'_s.png')
    a=s[...,3]; lab=np.argmin(((idp[...,None,:3]-np.array(list(IDC.values()),dtype=np.float32)[None,None])**2).sum(-1),-1); inside=idp[...,3]>.5
    M={k:((lab==i)&inside).astype(np.float32) for i,k in enumerate(PARTS)}
    _cache[pose]=(M,n,p,s,a); return _cache[pose]
def bird(pose,pal,size=224,soft=1.0,flutter=False):
    M,n,p,s,a=passes(pose); H=a.shape[0]; C=[hexc(c) for c in pal]  # belly back head cheek wing tail beak leg
    sig=H*.012
    W={k:ndi.gaussian_filter(M[k],sig*(.5 if k in('beak','leg') else 1)) for k in PARTS if k!='eye'}
    tot=sum(W.values())+1e-6
    z=(p[...,2]/.6); x=(p[...,0]-.5)/.4
    belly=ss(-.6,.9,(.66-z)*3.4+x*1.300)[...,None]
    col={'body':C[1]*(1-belly)+C[0]*belly,'head':np.broadcast_to(C[2],(H,H,3)),'cheek':np.broadcast_to(C[3],(H,H,3)),'wing':np.broadcast_to(C[4],(H,H,3)),'wingtip':np.broadcast_to(C[4]*.45+C[5]*.55,(H,H,3)),'tail':np.broadcast_to(C[5],(H,H,3)),'beak':np.broadcast_to(C[6],(H,H,3)),'leg':np.broadcast_to(C[7],(H,H,3))}
    rgb=sum(col[k]*W[k][...,None] for k in W)/tot[...,None]
    sh=ndi.gaussian_filter(s[...,0],sig*.6); rgb=rgb*(.74+.36*sh[...,None])
    nz=n[...,2]*2-1; rim=ss(.55,.05,nz)[...,None]*.34; rgb=rgb*(1-rim)+rim   # glow toward white at the edges
    gor=ndi.gaussian_filter(M['cheek'],sig*.6)[...,None]; sh2=ss(.35,.95,n[...,0])[...,None]*.55+ss(.6,1.,n[...,1])[...,None]*.25; rgb=rgb*(1-gor*sh2)+hexc(pal[8] if len(pal)>8 else '#ffffff')*gor*sh2
    rgb=np.clip(rgb,0,1)
    # soften: body gets the full airbrush, beak and legs stay a little firmer
    firm=np.clip(M['beak']+M['leg'],0,1); wg=np.clip(M['wing']+M['wingtip'],0,1) if flutter else 0*a; soft_a=a*(1-firm)*(1-wg)
    def blur(rgb,al,sg): pm=ndi.gaussian_filter(rgb*al[...,None],(sg,sg,0)); ab=ndi.gaussian_filter(al,sg); return pm,ab
    pm1,a1=blur(rgb,soft_a,sig*1.250*soft); a1=np.clip(a1*1.120,0,1)
    pm2,a2=blur(rgb,a*firm,sig*.42)
    out_pm=pm2*(1-a1[...,None])+pm1*1; out_a=a2*(1-a1)+a1   # legs behind the body
    # beak on top
    bk=ndi.gaussian_filter(M['beak']*a,sig*.42); out_pm=out_pm*(1-bk[...,None])+ndi.gaussian_filter(rgb*(M['beak']*a)[...,None],(sig*.42,sig*.42,0)); out_a=np.maximum(out_a,bk)
    if flutter:
        wc=np.broadcast_to(C[4],(H,H,3))*(.8+.3*sh[...,None]); wc=np.clip(wc*(1-rim*.6)+rim*.6,0,1)
        for part,sg,al in (('wingtip',3.4,.34),('wing',2.2,.62)):
            wm=M[part]*a; pmw=ndi.gaussian_filter(wc*wm[...,None],(sig*sg,sig*sg*.6,0)); aw=ndi.gaussian_filter(wm,(sig*sg,sig*sg*.6)); pmw*=al; aw*=al
            out_pm=out_pm*(1-aw[...,None])+pmw; out_a=out_a*(1-aw)+aw
    # the eye stays crisp
    e=ndi.gaussian_filter(M['eye'],.9); e=np.clip(e*1.300,0,1); out_pm=out_pm*(1-e[...,None])+np.array([.07,.06,.08])*e[...,None]; out_a=np.maximum(out_a,e)
    lab,cnt=ndi.label(M['eye']>.5)
    for i in range(1,cnt+1):
        ys,xs=np.where(lab==i)
        if len(ys)<12: continue
        r=max(1.2,(len(ys)/np.pi)**.5*.3); cy,cx=ys.mean()-r*.9,xs.mean()+r*.9; yy,xx=np.mgrid[0:H,0:H]; hl=np.clip(1.5-((yy-cy)**2+(xx-cx)**2)**.5/r,0,1)*e
        out_pm=out_pm*(1-hl[...,None])+hl[...,None]
    rgbo=np.where(out_a[...,None]>1e-4,out_pm/np.maximum(out_a[...,None],1e-4),0)
    im=Image.fromarray((np.clip(np.dstack([rgbo,out_a]),0,1)*255).astype(np.uint8),'RGBA')
    return im.resize((size,size),Image.LANCZOS)
def anchor(pose):
    M,n,p,s,a=passes(pose); H=a.shape[0]; ys,xs=np.where(M['leg']>.5)
    if len(ys)==0: ys,xs=np.where(a>.5)
    return [round(float(xs.mean()/H),3),round(float(ys.max()/H),3)]
if __name__=='__main__':
    PAL={ # belly, back, head, throat, wing, tail, bill, feet, shimmer
     'A':['#fff3d6','#b8324a','#751728','#f2c14e','#57131f','#862633','#2b1418','#2b1418','#fff3b0'],
     'B':['#fff3d6','#58ab72','#3f8f5e','#e02a6e','#2a6650','#3f8f5e','#2b1418','#2b1418','#ffb36a'],
     'C':['#fff3d6','#a892f2','#751728','#f2557a','#5142a6','#7c66d9','#2b1418','#2b1418','#ffd27a']}
    FL={'hover':1,'sip':1,'front':1,'dart':1}
    import os; os.makedirs('/home/claude/b3d/hum',exist_ok=True)
    poses=['hover','sip','front','perch','look','dart','head']
    sheet=Image.new('RGB',(300*7,300*3),(247,239,228))
    for j,(k,pal) in enumerate(PAL.items()):
        for i,po in enumerate(poses):
            b=bird(po,pal,600,.8,flutter=po in FL); b.save(f'/home/claude/b3d/hum/{k}_{po}.png'); t=b.resize((300,300),Image.LANCZOS); sheet.paste(t,(i*300,j*300),t)
    sheet.save('/home/claude/b3d/hum_test.png')
