import { boardStatusKey, roomStatusKey, type SemanticStatus } from './status-palette';

// Four-stop palettes from the supplied Telegram gradient reference.
export const ROOM_GRADIENT_PALETTES = {
  clean: ['#dbddbb', '#6ba587', '#d5d88d', '#88b884'],
  dirty: ['#ff70b4', '#f5b3d6', '#e65c9e', '#ffd1e7'],
  maintenance: ['#568fd6', '#626ed5', '#a667d5', '#7664da'],
  occupied: ['#b1e0fa', '#82b0d8', '#a0d8e8', '#e5f0f8'],
  reserved: ['#fec496', '#f7d992', '#f0ab36', '#e9bd68'],
  fault: ['#e54b4b', '#f27c66', '#d95745', '#f4a087'],
  available: ['#dce9e8', '#b9cbd5', '#ecede0', '#c8dddb'],
  completed: ['#dce9e8', '#b9cbd5', '#ecede0', '#c8dddb'],
} satisfies Partial<Record<SemanticStatus, readonly string[]>>;
export type RoomGradientKey = keyof typeof ROOM_GRADIENT_PALETTES;
export function roomGradientKey(state: {tone: string; operationalStatus: string}): RoomGradientKey {
  const key = state.tone === 'occupied' || state.tone === 'reserved' || state.tone === 'neutral'
    ? boardStatusKey(state) : roomStatusKey(state.operationalStatus);
  return key in ROOM_GRADIENT_PALETTES ? key as RoomGradientKey : 'available';
}
const ANCHORS = [[.8,.1],[.6,.2],[.35,.25],[.25,.6],[.2,.9],[.4,.8],[.65,.75],[.75,.4]];
export const ROOM_GRADIENT_SIZE = 50;

// Same eight anchors, swirl and fourth-power color weights as the reference.
// The phase comes from the card's scroll position instead of a running timer.
export function roomGradientPixels(colors: readonly string[], phase: number): Uint8ClampedArray {
  const size = ROOM_GRADIENT_SIZE;
  const pixels = new Uint8ClampedArray(size * size * 4);
  const wrapped = ((phase % 8) + 8) % 8, step = Math.floor(wrapped), progress = wrapped - step;
  const anchors = colors.map((_, i) => {
    const a = ANCHORS[(step + i * 2) % 8], b = ANCHORS[(step + i * 2 + 1) % 8];
    return [a[0] + (b[0] - a[0]) * progress, 1 - (a[1] + (b[1] - a[1]) * progress)];
  });
  // A white lift keeps small guest/date labels legible on the colorful surface.
  const rgb = colors.map(hex => [1,3,5].map(offset => parseInt(hex.slice(offset,offset+2),16) * .45 + 255 * .55));
  let offset = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cx = x / size - .5, cy = y / size - .5;
    const theta = (.35 * Math.hypot(cx,cy)) ** 2 * .8 * 8;
    const px = Math.max(0,Math.min(1,.5 + cx * Math.cos(theta) - cy * Math.sin(theta)));
    const py = Math.max(0,Math.min(1,.5 + cx * Math.sin(theta) + cy * Math.cos(theta)));
    let sum = 0, r = 0, g = 0, b = 0;
    for (let i = 0; i < rgb.length; i++) {
      const weight = Math.max(0,.9 - Math.hypot(px - anchors[i][0],py - anchors[i][1])) ** 4;
      sum += weight; r += weight * rgb[i][0]; g += weight * rgb[i][1]; b += weight * rgb[i][2];
    }
    pixels[offset++] = r / sum; pixels[offset++] = g / sum; pixels[offset++] = b / sum; pixels[offset++] = 255;
  }
  return pixels;
}
