// THE OBSERVATORY, PRINTED. From the photo of Ricard: the big ribbed dome on its cream drum with a row of
// dark windows, the small dome to the side, a weeping birch, a dark redwood, a torn strip of lawn.
import { rng, ellipse, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [900, 700];
export function draw(A) {
  const k = printkit(A, 55), r = rng(3);
  k.torn([[40, 120], [600, 90], [620, 380], [60, 420]], '#d7e0e3', { alpha: .9 });
  k.stamp([smooth([[700, 600], [690, 420], [705, 300], [720, 190], [738, 110], [756, 190], [776, 300], [796, 420], [790, 600]], true, 6)], '#4f5f45', { alpha: .9 });
  k.stamp([[[120, 360], [470, 360], [470, 560], [120, 560]]], '#efe2c6', { alpha: .95 });
  k.stamp([...Array.from({ length: 7 }, (_, i) => [[140 + i * 46, 420], [158 + i * 46, 420], [158 + i * 46, 488], [140 + i * 46, 488]]), [[270, 470], [320, 470], [320, 560], [270, 560]]], '#5a5550', { alpha: .85 });
  k.stamp([[...ellipse(295, 362, 190, 190, Math.PI, Math.PI * 2, 40), [485, 362]]], '#9aa0a3', { alpha: .9 });
  for (let i = -3; i <= 3; i++) k.dry([[295 + i * 50, 362], [295 + i * 44, 280], [295 + i * 20, 190], [295, 174]], 2.2, '#6f7477', { dry: .25 });
  k.stamp([[[318, 178], [334, 182], [338, 362], [322, 362]]], '#3f3b38', { alpha: .8 });
  k.stamp([[[560, 470], [640, 470], [640, 560], [560, 560]]], '#efe2c6', { alpha: .95 }); k.stamp([[...ellipse(600, 472, 46, 46, Math.PI, Math.PI * 2, 24), [646, 472]]], '#9aa0a3', { alpha: .9 });
  k.dry([[520, 600], [526, 450], [520, 300], [534, 190]], 7, '#8b8580', { dry: .2 });
  for (let i = 0; i < 9; i++) { const x = 470 + r() * 120, y = 200 + r() * 90; k.dry([[x, y], [x + (r() - .5) * 20, y + 60], [x + (r() - .5) * 30, y + 120 + r() * 80]], 2, '#8b8580', { dry: .35 }); }
  const dabs = []; for (let i = 0; i < 40; i++) dabs.push(k.blob(450 + r() * 160, 220 + r() * 220, 5, 8, r() * 3)); k.stamp(dabs, '#a9ad62', { alpha: .7 });
  k.torn([[20, 560], [880, 548], [890, 640], [30, 650]], '#8e9a4f');
  k.spatter(14, [40, 80, 880, 660], '#2b2622', 7);
}
