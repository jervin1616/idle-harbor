// Tiny hand-made pixel icons (no image files). Letters map to palette colors.
const COL: Record<string, string> = {
  k: '#2d1e3e', b: '#4fb3d6', B: '#25618f', o: '#f28c4a', y: '#ffd75e', w: '#fff8e8',
  r: '#c4453a', n: '#9a6236', N: '#6b3f23', s: '#e8b86a',
};
const ICONS: Record<string, string[]> = {
  fish: ['...kkkk.....', '.kkbbbbk..kk', 'kbbbbbbbkkbk', 'kbwkbbbbbbbk', 'kbbbbbbbkkbk', '.kkbbbbk..kk', '...kkkk.....'],
  basket: ['...kkkk...', '..k....k..', '.kkkkkkkk.', 'kssnssnssk', 'knsnsnsnnk', 'ksnssnssnk', '.knsnssnk.', '..kkkkkk..'],
  rod: ['........kk', '.......kn.', '......kn..', '.....kn..k', '....kn...k', '...kn....k', '..kn.....k', '.kn......k', 'kn.......r', 'k........r'],
  boat: ['......k.....', '......kk....', '......kwk...', '......kwwk..', 'kkkkkkkkkkk.', '.knnnnnnnnk.', '..kknnnnkk..', '....kkkk....'],
  hat: ['...kkkk...', '..kyyyyk..', '.kyywyyyk.', '.kyyyyyyk.', 'kkkkkkkkkk', 'kyyyyyyyyk', '.kkkkkkkk.'],
};
export const stationIcon: Record<string, string> = { dock: 'rod', shed: 'fish', market: 'basket', fleet: 'boat' };

export function makeIcon(name: string, cls = 'ico'): HTMLCanvasElement {
  const rows = ICONS[name];
  const c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length; c.className = cls;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (COL[ch]) { g.fillStyle = COL[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
