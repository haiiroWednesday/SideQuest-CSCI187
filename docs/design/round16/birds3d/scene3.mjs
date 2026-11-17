import * as THREE from '/three/three.module.js'
const RES = 448, D = Math.PI / 180
const IDC = { body: [1, 0, 0], head: [0, 1, 0], cheek: [0, 1, 1], wing: [0, 0, 1], wingtip: [1, 0, 1], tail: [1, 1, 0], beak: [1, 1, 1], leg: [.5, .5, .5], eye: [.5, 0, 0] }
const V = (a) => new THREE.Vector3(...a)
const sph = new THREE.SphereGeometry(1, 40, 28), cylg = new THREE.CylinderGeometry(1, 1, 1, 12)
function build(P) {
  const root = new THREE.Group(), tilt = new THREE.Group(); root.rotation.x = -Math.PI / 2; root.add(tilt); tilt.rotation.set(0, (P.pitch || 0) * D, 0)
  const ell = (part, pos, sc, rot = [0, 0, 0], parent = tilt) => { const m = new THREE.Mesh(sph); m.position.set(...pos); m.scale.set(...sc); m.rotation.set(rot[0] * D, rot[1] * D, rot[2] * D); m.userData.part = part; parent.add(m); return m }
  const grp = (pos, rot = [0, 0, 0], parent = tilt) => { const g = new THREE.Group(); g.position.set(...pos); g.rotation.set(rot[0] * D, rot[1] * D, rot[2] * D); parent.add(g); return g }
  const stick = (part, a, b, r, parent) => { const A = V(a), B = V(b), m = new THREE.Mesh(cylg), d = B.clone().sub(A); m.position.copy(A.clone().add(B).multiplyScalar(.5)); m.scale.set(r, d.length(), r); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.userData.part = part; parent.add(m); const cap = new THREE.Mesh(sph); cap.position.copy(B); cap.scale.setScalar(r * 1.150); cap.userData.part = part; parent.add(cap) }
  // torso: chest, belly, rump, neck. Faces +X, Z is up.
  ell('body', [.1, 0, .6], [.5, .43, .46], [0, -28, 0]); ell('body', [-.2, 0, .5], [.44, .36, .35], [0, 12, 0]); ell('body', [.27, 0, .84], [.3, .3, .3]); ell('body', [.3, 0, .52], [.3, .32, .32])
  const hp = grp([.34 + (P.hx || 0), 0, 1.03 + (P.hz || 0)], [P.hroll || 0, P.hpitch || 0, P.hyaw || 0])
  ell('head', [0, 0, 0], [.37, .35, .34], [0, 0, 0], hp); ell('head', [-.04, 0, .1], [.3, .3, .26], [0, 0, 0], hp)
  for (const s of [1, -1]) { ell('cheek', [.14, s * .17, -.1], [.17, .14, .15], [0, 0, 0], hp); ell('eye', [.18, s * .3, .06], [.06, .03, .06], [0, 0, 0], hp) }
  const op = P.beak || 0
  ell('beak', [.36, 0, -.02 + op * .03], [.15, .1, .09], [0, 22 - op * 22, 0], hp); ell('beak', [.44, 0, -.09 + op * .05], [.06, .06, .08], [0, 30 - op * 22, 0], hp); ell('beak', [.33, 0, -.1 - op * .04], [.1, .08, .05], [0, 8 + op * 26, 0], hp)
  // tail: five feathers, fanned
  const tp = grp([-.5, 0, .5], [0, -(P.tail ?? 12), 0]), fan = P.fan || 1
  ;[-22, -11, 0, 11, 22].forEach((a, i) => { const pv = grp([0, 0, 0], [0, 0, a * fan], tp); ell('tail', [-.36 - (i === 2 ? .06 : 0), 0, 0], [.42 + (i === 2 ? .06 : 0), .075, .03], [0, 0, 0], pv) })
  // wings
  for (const s of [1, -1]) {
    const sh = [.12, s * .36, .84]
    if (!P.spread) { const wp = grp([.14, s * .4, .84], [s * -8, -18, s * 4]); ell('wing', [-.3, s * .06, -.2], [.42, .07, .22], [0, 0, 0], wp); ell('wing', [-.12, s * .075, -.1], [.24, .06, .16], [0, 0, 0], wp)
      for (let i = 0; i < 4; i++) ell('wingtip', [-.5 - i * .09, s * .07, -.36 + i * .05], [.26, .04, .065], [0, 18 - i * 8, 0], wp) }
    else { const near = s === -1, th = (near ? P.wup : (P.wupFar ?? P.wup)) * D, sw = P.wsweep ?? .3
      const span = V([-sw, s * Math.sin(th), Math.cos(th)]).normalize(), c0 = V([-1, 0, -(P.wdrop || 0)]).normalize(), chord = c0.clone().sub(span.clone().multiplyScalar(c0.dot(span))).normalize(), nrm = span.clone().cross(chord).normalize()
      const place = (part, dir, inpl, center, sc) => { const m = new THREE.Mesh(sph), b = new THREE.Matrix4().makeBasis(dir, inpl, nrm); m.quaternion.setFromRotationMatrix(b); m.position.copy(center); m.scale.set(...sc); m.userData.part = part; tilt.add(m) }
      const S = V(sh); place('wing', span, chord, S.clone().add(span.clone().multiplyScalar(.36)).add(chord.clone().multiplyScalar(.2)), [.46, .32, .06])
      const n = 10
      for (let i = 0; i < n; i++) { const t = i / (n - 1), a = (-12 + t * 112) * D, L = (1.360 - .7 * Math.pow(t, 1.200)) * (P.wlen || 1), dir = span.clone().multiplyScalar(Math.cos(a)).add(chord.clone().multiplyScalar(Math.sin(a))).normalize(), inpl = nrm.clone().cross(dir).normalize()
        place(t < .62 ? 'wingtip' : 'wing', dir, inpl, S.clone().add(dir.clone().multiplyScalar(L * .56)).add(nrm.clone().multiplyScalar((i % 2) * .012)), [L * .5, .13, .024]) }
      for (let i = 0; i < 6; i++) { const t = i / 5, a = (4 + t * 96) * D, L = .78 - .2 * t, dir = span.clone().multiplyScalar(Math.cos(a)).add(chord.clone().multiplyScalar(Math.sin(a))).normalize(), inpl = nrm.clone().cross(dir).normalize(); place('wing', dir, inpl, S.clone().add(dir.clone().multiplyScalar(L * .5)).add(nrm.clone().multiplyScalar(-.03 * s)), [L * .5, .14, .03]) } } }
  // legs
  for (const s of [1, -1]) { const hx = -.02, hy = s * .15
    if ((P.legs || 'stand') === 'stand') { const k = [hx + .02, hy, .075]; stick('leg', [hx, hy, .3], k, .028, root); for (const a of [-28, 0, 28]) stick('leg', k, [k[0] + .2 * Math.cos(a * D), k[1] + .2 * Math.sin(a * D), .02], .022, root); stick('leg', k, [k[0] - .12, k[1], .02], .022, root) }
    else { const k = [hx - .2, hy, .17]; stick('leg', [hx, hy, .34], k, .026, tilt); for (const a of [-22, 0, 22]) stick('leg', k, [k[0] - .16 * Math.cos(a * D), k[1] + .16 * Math.sin(a * D), k[2] - .05], .02, tilt) } }
  return root }
const vs = `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const mat = fs => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: 'varying vec3 vN; varying vec3 vW; uniform vec3 uC; uniform vec3 uL;' + fs, uniforms: { uC: { value: new THREE.Vector3() }, uL: { value: new THREE.Vector3() } } })
const FS = { id: 'void main(){ gl_FragColor = vec4(uC,1.); }', n: 'void main(){ gl_FragColor = vec4(normalize(vN)*.5+.5,1.); }', p: 'void main(){ gl_FragColor = vec4(vW.x*.4+.5, -vW.z*.4+.5, vW.y*.6, 1.); }',
  s: 'void main(){ float d = dot(normalize(vN), normalize(uL)); float h = pow(d*.5+.5, 1.400); gl_FragColor = vec4(vec3(clamp(.12 + h*1.050,0.,1.)),1.); }' }
THREE.ColorManagement.enabled = false
const mk = aa => { const r = new THREE.WebGLRenderer({ antialias: aa, alpha: true, preserveDrawingBuffer: true }); r.setSize(RES, RES); r.setPixelRatio(1); r.outputColorSpace = THREE.LinearSRGBColorSpace; r.setClearColor(0, 0); return r }
const rAA = mk(true), rID = mk(false)
window.shoot = (P) => { const scene = new THREE.Scene(), root = build(P); scene.add(root)
  const z = (P.zoom || 2.500) / 2, cam = new THREE.OrthographicCamera(-z, z, z, -z, .1, 50), yaw = (P.yaw ?? 15) * D, el = (P.el ?? 6) * D, t = P.tgt || [-.05, 0, .72]
  const tgt = new THREE.Vector3(t[0], t[2], -t[1]), d = new THREE.Vector3(Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el)); cam.position.copy(tgt.clone().add(d.multiplyScalar(10))); cam.lookAt(tgt)
  const out = {}
  for (const k of ['id', 'n', 'p', 's']) { const r = k === 'id' ? rID : rAA
    scene.traverse(o => { if (o.isMesh) { const m = mat(FS[k]); if (k === 'id') m.uniforms.uC.value.set(...IDC[o.userData.part || 'body']); m.uniforms.uL.value.set(-.5, .8, .55); o.material = m } })
    r.render(scene, cam); out[k] = r.domElement.toDataURL('image/png') }
  return out }
window.ready = true
