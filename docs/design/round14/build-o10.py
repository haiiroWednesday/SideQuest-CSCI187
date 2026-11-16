import base64,sys,re,os
PARTS=['a','b']
d='tl-design'
def ff(fam,file,style,w):
    b=base64.b64encode(open(f'{d}/fonts/{file}','rb').read()).decode()
    return f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{w};font-display:block;src:url(data:font/woff2;base64,{b}) format('woff2')}}"
fonts=''.join([ff('Instrument Serif','instrument-serif-latin-400-normal.woff2','normal','400'),ff('Instrument Serif','instrument-serif-latin-400-italic.woff2','italic','400'),
 ff('DM Mono','dm-mono-latin-500-normal.woff2','normal','400 500'),ff('Barlow Condensed','barlow-condensed-latin-700-normal.woff2','normal','700'),ff('Barlow Condensed','barlow-condensed-latin-600-normal.woff2','normal','600'),
 ff('Instrument Sans','instrument-sans-latin-standard-normal.woff2','normal','400 700'),ff('Instrument Sans','instrument-sans-latin-standard-italic.woff2','italic','400 700')])
R=lambda f: open(f'{d}/{f}').read()
phcss='\n'.join(l.replace('.r7 .ph-','.ph-') for l in R('r10-css.txt').split('\n') if '.r7 .ph-' in l)
body=R('zero.body.html').replace('<title>Zero Setup</title>','<title>Options Round 10</title>').replace('</style>',R('louder.css.part')+R('opts.css.part')+R('o2.css.part')+phcss+R('q10-css.txt')+'</style>',1).replace('/*FONTS*/',fonts)
js=R('fr-helpers.part')+R('zero.lib.part')+R('louder.js.part')
o=R('opts.js.part'); o=o[:o.index('// ---- board ----')]
js+=o+R('o2-common.part')+''.join(R(f'o2-{p}.part') for p in ['discover','schedule','post','someday','voice'])+''.join(R(f'o3-{p}.part') for p in ['discover','schedule','post','someday'])+R('o4-common.part')+''.join(R(f'o4-{p}.part') for p in ['discover','schedule','post','someday'])+R('o5-all.part')+R('o6-common.part')+''.join(R(f'o6-{p}.part') for p in ['discover','schedule','rest'])+R('o7-photo.part')+R('o8-a.part')+''.join(R(f'o10-{p}.part') for p in PARTS)+R('o10-board.part')
body=body.replace('<body>','<body>'+R('review-defs.txt'),1)
open(f'{d}/opts10.html','w').write(body+js)
