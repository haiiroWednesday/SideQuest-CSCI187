const INK='#2a1c22',KIND={arts:['#8f4fd0','Arts'],learning:['#2a64d6','Learning'],social:['#e5338b','Social'],sports:['#25a35a','Sports'],service:['#f28a1e','Service'],wellness:['#14a6b8','Wellness']};
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],TODAY=3;
const FULL=[[['arts',1.5,1,'Open studio','6:00 to 7:30'],['social',1,0,'Club fair','12:00 to 1:00']],[['learning',1,0,'Python study hall','4:00 to 5:00']],[['sports',2,2,'Pick-up soccer','5:00 to 7:00'],['social',1,1,'Boba run','8:00 to 9:00'],['wellness',1,0,'Yoga on the lawn','7:00 to 8:00 am']],[['learning',1.5,1,'Guest talk','3:00 to 4:30']],[['arts',1,0,'Poetry reading','7:00 to 8:00'],['service',1.5,1,'Garden shift','10:00 to 11:30']],[['social',1.5,2,'Night market','6:00 to 7:30'],['arts',2,1,'Jazz on the lawn','4:00 to 6:00'],['sports',1,0,'Bronco game','1:00 to 2:00']],[['wellness',1,0,'Sunday walk','9:00 to 10:00']]];
const SLOW=[[],[],[['learning',1,0,'Python study hall','4:00 to 5:00']],[],[],[['social',1.5,1,'Night market','6:00 to 7:30']],[]];
let SD=1;const R=()=>{const v=Math.sin(SD++*91.7+3.1)*43758.5;return v-Math.floor(v);},j=a=>(R()-.5)*2*a,f=v=>v.toFixed(1);
const hex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16)),mix=(a,b,t)=>{const A=hex(a),B=hex(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const petal=(x,y,rx,ry,a,c,o=.92)=>{const ca=Math.cos(a),sa=Math.sin(a),P=(u,v)=>[x+u*ca-v*sa,y+u*sa+v*ca],p0=P(-rx,0),p1=P(0,-ry*(1+j(.15))),p2=P(rx,0),p3=P(0,ry*.75);
  return `<path d="M${f(p0[0])} ${f(p0[1])}Q${f(P(-rx*.9,-ry*1.1)[0])} ${f(P(-rx*.9,-ry*1.1)[1])} ${f(p1[0])} ${f(p1[1])}Q${f(P(rx*.95,-ry*1.05)[0])} ${f(P(rx*.95,-ry*1.05)[1])} ${f(p2[0])} ${f(p2[1])}Q${f(P(rx*.7,ry*.9)[0])} ${f(P(rx*.7,ry*.9)[1])} ${f(p3[0])} ${f(p3[1])}Q${f(P(-rx*.75,ry*.85)[0])} ${f(P(-rx*.75,ry*.85)[1])} ${f(p0[0])} ${f(p0[1])}Z" fill="${c}" opacity="${o}"/>`;};
const pen=(d,w=1.2,c=INK,o=.85)=>`<path d="${d}" stroke="${c}" stroke-width="${f(w*(.85+R()*.3))}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${o}" filter="url(#wpn)"/>`;
// Flowers and bees, redrawn with gradients (Nov 24). Each floret is a pea flower: a pale banner
// petal with a cream eye, two deeper wing petals under it. Buds are glossy teardrops. Colour runs
// from a near-white heart to the category colour at the rim, the way light sits in her paintings.
(function gradients(){const d=document.querySelector('#wv defs');if(!d||d.dataset.g)return;d.dataset.g='1';let g='';
  for(const[k,[c]]of Object.entries(KIND)){
    g+=`<radialGradient id="gb-${k}" cx="50%" cy="78%" r="80%"><stop offset="0" stop-color="#fff9e6"/><stop offset=".22" stop-color="${mix(c,'#ffffff',.78)}"/><stop offset=".62" stop-color="${mix(c,'#ffffff',.38)}"/><stop offset="1" stop-color="${mix(c,'#ffffff',.08)}"/></radialGradient>`;
    g+=`<linearGradient id="gw-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(c,'#ffffff',.3)}"/><stop offset="1" stop-color="${mix(c,INK,.28)}"/></linearGradient>`;
    g+=`<radialGradient id="gd-${k}" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="${mix(c,'#ffffff',.55)}"/><stop offset=".45" stop-color="${mix(c,INK,.12)}"/><stop offset="1" stop-color="${mix(c,INK,.42)}"/></radialGradient>`;}
  g+=`<radialGradient id="g-eye" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe27a"/><stop offset=".55" stop-color="#fff3c4" stop-opacity=".8"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>`;
  g+=`<radialGradient id="g-bee" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff4b8"/><stop offset=".4" stop-color="#ffc83a"/><stop offset="1" stop-color="#d9860c"/></radialGradient>`;
  g+=`<linearGradient id="g-wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#c9e3f2" stop-opacity=".55"/></linearGradient>`;
  g+=`<radialGradient id="g-head" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#6a4a52"/><stop offset="1" stop-color="${INK}"/></radialGradient>`;
  g+=`<filter id="wsoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
  g+=`<filter id="wfz" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale=".9" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  d.insertAdjacentHTML('beforeend',g);})();
function floret(x,y,sz,side,k){const tilt=side*(.38+j(.22));
  return petal(x+side*.9*sz,y+2.5*sz,2.7*sz+.6,2*sz+.5,side*.75+j(.2),`url(#gw-${k})`,.96)
    +petal(x-side*.4*sz,y+2.9*sz,2.2*sz+.5,1.7*sz+.4,-side*.3+j(.2),`url(#gw-${k})`,.9)
    +petal(x,y,4.7*sz+1.2,4.3*sz+1.1,tilt,`url(#gb-${k})`,.97)
    +`<ellipse cx="${f(x+side*.3*sz)}" cy="${f(y+1.1*sz)}" rx="${f(1.5*sz+.4)}" ry="${f(1.1*sz+.3)}" fill="url(#g-eye)"/>`;}
function bud(x,y,sz,a,k){return petal(x,y,1.5*sz+.9,3.2*sz+1.2,a,`url(#gd-${k})`,.97)
  +`<ellipse cx="${f(x-.5*sz)}" cy="${f(y-1.3*sz)}" rx="${f(.45*sz+.2)}" ry="${f(.9*sz+.3)}" fill="#ffffff" opacity=".45" transform="rotate(${f(a*57)} ${f(x)} ${f(y)})"/>`;}
function raceme(x,y,hrs,kind,friends,state,info,delay){const tiers=Math.round(hrs*6),L=tiers*10.5+12,sway=j(6);let fl='',buds='';
  const ax=t=>x+Math.sin(t*2.2)*sway*t,ay=t=>y+t*L;
  let st=`M${f(x)} ${f(y)}`;for(let k=1;k<=10;k++){const t=k/10;st+=`L${f(ax(t))} ${f(ay(t))}`;}
  const open=state==='past'?1:state==='today'?.5:0;
  // Florets crowd round the stem at uneven angles, the ones behind drawn first and a little smaller,
  // so a cluster reads as a hanging bunch, never as mirrored pairs.
  const back=[],front=[];
  for(let i=0;i<tiers;i++){const t=(i+.5+j(.25))/(tiers+.6),cx=ax(t),cy=ay(t),sz=1.2-t*.72,isOpen=t<open*1.02&&t<.86;
    const n=isOpen?(t<.35?3:2+(R()<.5?1:0)):(R()<.55?2:1),spin=R()*6.28;
    for(let m=0;m<n;m++){const th=spin+m*6.28/n+j(.5),cs=Math.cos(th),dep=Math.sin(th),side=cs<0?-1:1;
      const px=cx+cs*(isOpen?5.6*sz+1:2.6*sz+.7),py=cy+dep*1.6*sz+j(1.2),k=.86+dep*.12+j(.06);
      const item=isOpen?floret(px,py,sz*k,side,kind):bud(px,py,sz*(.8+R()*.35),side*(.2+R()*.25),kind);
      (dep<0?back:front).push(item);}}
  fl=back.join('')+front.join('');
  const tx=ax(1),ty=ay(1);buds+=bud(tx,ty-1,.55,0,kind)+bud(tx+j(1),ty+3,.35,0,kind);
  const glow='' // the soft glow behind clusters was dropped: it read as mist (Nov 24)
  let bees='';for(let k=0;k<friends;k++){const bx=ax(.3+k*.25)+(k%2?-15:15),by=ay(.3+k*.25);bees+=bee(bx,by,k);}
  return `<g class="rc" style="animation-delay:${delay}ms" data-info="${info}"><path d="M${f(x-14)} ${f(y-4)}h28v${f(L+16)}h-28Z" fill="transparent"/>${glow}${pen(st,1,'#6b5a3a',.7)}<g filter="url(#wfz)">${buds}${fl}</g>${bees}</g>`;}
// A round, fuzzy bee: gold body lit from the top left, curved stripes that wrap the body,
// glassy wings, dark head with two antennae.
function bee(x,y,k){const id=`bc${k}-${Math.round(x*10)}-${Math.round(y*10)}`;
  return `<g class="bee" style="animation-delay:${(k*.37).toFixed(2)}s">`
  +`<ellipse cx="${f(x-1.6)}" cy="${f(y-4)}" rx="3.4" ry="2.2" fill="url(#g-wing)" stroke="${INK}" stroke-opacity=".35" stroke-width=".35" transform="rotate(-24 ${f(x-1.6)} ${f(y-4)})"/>`
  +`<ellipse cx="${f(x+1.2)}" cy="${f(y-3.8)}" rx="3" ry="1.9" fill="url(#g-wing)" stroke="${INK}" stroke-opacity=".35" stroke-width=".35" transform="rotate(18 ${f(x+1.2)} ${f(y-3.8)})"/>`
  +`<clipPath id="${id}"><ellipse cx="${f(x)}" cy="${f(y)}" rx="4.6" ry="3.4"/></clipPath>`
  +`<ellipse cx="${f(x)}" cy="${f(y)}" rx="4.6" ry="3.4" fill="url(#g-bee)" stroke="#b8740f" stroke-width=".5" stroke-dasharray=".5 .6"/>`
  +`<g clip-path="url(#${id})" fill="none" stroke="${INK}" stroke-opacity=".82" stroke-width="1.15" stroke-linecap="round"><path d="M${f(x-1.6)} ${f(y-3.6)}q-1.1 3.6 0 7.2"/><path d="M${f(x+.9)} ${f(y-3.6)}q-1.1 3.6 0 7.2"/></g>`
  +`<path d="M${f(x-4.6)} ${f(y)}l-1.3 .3" stroke="${INK}" stroke-width=".7" stroke-linecap="round"/>`
  +`<circle cx="${f(x+4.7)}" cy="${f(y-.4)}" r="1.9" fill="url(#g-head)"/>`
  +`<path d="M${f(x+5.4)} ${f(y-2)}q.6 -1.8 1.9 -2.1M${f(x+4.7)} ${f(y-2.1)}q.2 -1.9 1.2 -2.6" stroke="${INK}" stroke-width=".45" fill="none" stroke-linecap="round"/>`
  +`<circle cx="${f(x+5.3)}" cy="${f(y-.9)}" r=".35" fill="#ffffff"/></g>`;}
function leaf(x,y,ang,n,s){let o='';const ca=Math.cos(ang),sa=Math.sin(ang);let mid=`M${f(x)} ${f(y)}`;
  for(let i=1;i<=n;i++){const t=i/n,px=x+ca*s*t,py=y+sa*s*t+t*t*s*.25;mid+=`L${f(px)} ${f(py)}`;
    for(const side of[-1,1])if(i<n){const lx=px-sa*side*5.5,ly=py+ca*side*5.5+2;o+=petal(lx,ly,3.2,1.8,ang+side*.7,mix('#7d9a5a','#c4cf8e',R()*.5),.8);}else o+=petal(px+ca*3,py+sa*3+1,3.4,1.9,ang,mix('#7d9a5a','#c4cf8e',R()*.5),.8);}
  return pen(mid,.7,'#5f7440',.6)+`<g filter="url(#wmk)">${o}</g>`;}
function draw(week){SD=11;const VY=44;let s='';
  s+=`<g filter="url(#wmk)"><path d="M6 ${VY-12}H354v7H6Z" fill="#c99258" opacity=".55"/></g>`;
  let v1=`M2 ${VY}`,v2=`M2 ${VY+3}`;for(let x=2;x<=358;x+=8){v1+=`L${x} ${f(VY+Math.sin(x/23)*5+j(.6))}`;v2+=`L${x} ${f(VY+Math.sin(x/23+2.4)*4.5+j(.6))}`;}
  s+=pen(v1,3.4,'#7b5636',.9)+pen(v2,2,'#5d3f28',.85);
  for(let i=0;i<9;i++){const lx=12+i*41+j(6);s+=leaf(lx,VY-3+j(3),(i%2?-.25:.15)+j(.2)-(i%3===0?.9:0),5,26+R()*8);}
  for(let i=0;i<5;i++){const tx=30+i*72;s+=pen(`M${tx} ${VY+2}q6 -10 0 -16q-6 -6 2 -10`,.8,'#5f7440',.55);}
  week.forEach((evs,d)=>{const cx=26+d*51.3;
    s+=`<text x="${f(cx)}" y="20" text-anchor="middle" font-family="var(--font-sans)" font-size="12" font-weight="700" fill="${INK}" opacity="${d===TODAY?1:.62}">${DAYS[d].toUpperCase()}</text>`;
    if(d===TODAY)s+=pen(`M${f(cx-13)} 25q13 3 26 -1`,1.6,'#e53935',.9);
    const n=evs.length;evs.forEach(([k,h,fr,name,time],i)=>{const off=(i-(n-1)/2)*16.5,state=d<TODAY?'past':d===TODAY?'today':'soon';
      const info=`${DAYS[d]} · ${name} · ${time}${fr?` · with ${fr} friend${fr>1?'s':''}`:''}`;
      s+=raceme(cx+off,VY+5+(i%2)*7,h,k,fr,state,info,d*110+i*70);});
    if(!n)s+=pen(`M${f(cx)} ${VY+4}q2 10 -1 18`,.9,'#6b5a3a',.45);});
  const KY=214;s+=`<g transform="rotate(-1 180 ${KY+30})"><g filter="url(#wmk)"><path d="M8 ${KY}H352V${KY+80}H8Z" fill="#ffe27a" opacity=".85"/></g>`;
  s+=`<text x="18" y="${KY+15}" font-family="var(--font-sans)" font-size="9.5" font-weight="700" letter-spacing="1" fill="${INK}">HOW TO READ IT</text>`;
  const kt=(x,y,t)=>`<text x="${x}" y="${y}" font-family="var(--font-sans)" font-size="10.5" fill="${INK}">${t}</text>`;
  SD=99;s+=`<g filter="url(#wfz)">${floret(22,KY+28,.8,-1,'arts')+floret(30,KY+29,.8,1,'arts')+floret(26,KY+35,.6,-1,'arts')+bud(26,KY+42,.5,0,'arts')}</g>`+kt(38,KY+36,'longer = a longer event');
  s+=`<g filter="url(#wfz)">${bud(180,KY+29,.8,-.2,'arts')+bud(186,KY+31,.8,.2,'arts')+bud(183,KY+38,.6,0,'arts')}</g>`+kt(196,KY+36,'buds = still coming');
  s+=bee(24,KY+52,0)+kt(38,KY+56,'one bee = one friend going');
  let sx=18;Object.entries(KIND).forEach(([k,[c,l]])=>{s+=`<g filter="url(#wfz)">${floret(sx+4,KY+70,.75,1,k)}</g>`+kt(sx+11,KY+75,l);sx+=l.length*5.2+20;});
  s+=`</g>`;
  document.getElementById('art').innerHTML=s;
  document.querySelectorAll('.rc').forEach(g=>g.addEventListener('click',()=>{document.getElementById('cap').textContent=g.dataset.info;}));}
let full=true;draw(FULL);
document.getElementById('tg').onclick=()=>{full=!full;draw(full?FULL:SLOW);document.getElementById('tg').textContent=full?'Show a slow week':'Show a full week';document.getElementById('cap').textContent=full?'Tap a cluster to see the event.':'Two things saved. Room to wander.';};
