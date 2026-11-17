import numpy as np, sys, json
from PIL import Image
from scipy import ndimage as ndi
D='/home/claude/b3d/out3/'
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
def bird(pose,pal,size=224,soft=1.0):
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
    rgb=np.clip(rgb,0,1)
    # soften: body gets the full airbrush, beak and legs stay a little firmer
    firm=np.clip(M['beak']+M['leg'],0,1); soft_a=a*(1-firm)
    def blur(rgb,al,sg): pm=ndi.gaussian_filter(rgb*al[...,None],(sg,sg,0)); ab=ndi.gaussian_filter(al,sg); return pm,ab
    pm1,a1=blur(rgb,soft_a,sig*1.250*soft); a1=np.clip(a1*1.120,0,1)
    pm2,a2=blur(rgb,a*firm,sig*.42)
    out_pm=pm2*(1-a1[...,None])+pm1*1; out_a=a2*(1-a1)+a1   # legs behind the body
    # beak on top
    bk=ndi.gaussian_filter(M['beak']*a,sig*.42); out_pm=out_pm*(1-bk[...,None])+ndi.gaussian_filter(rgb*(M['beak']*a)[...,None],(sig*.42,sig*.42,0)); out_a=np.maximum(out_a,bk)
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
    import base64,io
    poses=['sit','sit2','look','front','peck','sing','tilt','fly','fly2','land','flap']
    PAL=json.load(open('/home/claude/b3d/pal.json'))
    if len(sys.argv)>1 and sys.argv[1]=='test':
        sheet=Image.new('RGB',(200*11,200*len(PAL)),(247,239,228))
        for j,(k,pal) in enumerate(PAL.items()):
            for i,po in enumerate(poses): b=bird(po,pal,200); sheet.paste(b,(i*200,j*200),b)
        sheet.save('/home/claude/b3d/test.png')
    else:
        css=''; n=0
        for k,pal in PAL.items():
            for po in poses:
                b=bird(po,pal,184); bio=io.BytesIO(); b.save(bio,'WEBP',quality=80,method=6); n+=len(bio.getvalue())
                css+=f".bd-{k}-{po}{{background:url(data:image/webp;base64,{base64.b64encode(bio.getvalue()).decode()}) center/100% 100% no-repeat}}\n"
        b=bird('tilt',PAL['bronco'],448,.8); bio=io.BytesIO(); b.save(bio,'WEBP',quality=84,method=6); css+=f".bd-hero{{background:url(data:image/webp;base64,{base64.b64encode(bio.getvalue()).decode()}) center/100% 100% no-repeat}}\n"
        S='/tmp/claude-0/-home-claude/15eaa40f-8be2-57fd-81ac-4eade22f5931/scratchpad/tl-design/'
        open(S+'q12-css.txt','w').write(css)
        open(S+'o12-birds.part','w').write('\n// soft birds: modelled in three.js, shaded and softened, one sprite per pose and palette\nconst BP12 = '+json.dumps(PAL)+'\nconst BA12 = '+json.dumps({po:anchor(po) for po in poses})+'\n')
        print(n,len(css))
