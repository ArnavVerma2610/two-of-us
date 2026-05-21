// Pixel-art sprites encoded as string grids. Each character maps to a color
// (see `legend`). A space (' ') or '.' means transparent.
//
// Rendering is done by <PixelSprite /> which paints each cell as a <div> via a
// CSS grid — crisp, no anti-aliasing.

export type SpriteGrid = string[]

export type Sprite = {
  grid: SpriteGrid
  legend: Record<string, string>
}

const C = {
  ink: '#15131C',
  bone: '#F4ECDC',
  cyan: '#2EC4D6',
  cyanD: '#1C8C99',
  cyanL: '#8DE6F1',
  orange: '#FF7A2A',
  orangeD: '#C2531A',
  orangeL: '#FFB27A',
  red: '#E63946',
  gold: '#F2B33D',
  mint: '#7FD6A8',
  mintD: '#4FA67C',
  violet: '#6B5BD2',
  skin: '#E8B894',
  skinD: '#C28E63',
  white: '#FFFFFF',
  gray: '#6E6A7C',
  steel: '#B9C0CC',
  cream: '#F6E6C4',
  green: '#7DC832',
  purple: '#8A3FE0',
  magenta: '#F15BB5',
}

// --- Player 1 — cyan-haired fighter (bust) ---------------------------------
export const spriteP1: Sprite = {
  legend: {
    o: C.ink,
    h: C.cyan,
    H: C.cyanL,
    s: C.skin,
    d: C.skinD,
    j: C.cyanD,
    w: C.bone,
    e: C.ink,
  },
  grid: [
    '....oooo....',
    '...oHHHHo...',
    '..oHhhhhHo..',
    '..ohhhhhho..',
    '..osssssso..',
    '..osesesso..',
    '..osssssso..',
    '..odssssdo..',
    '...osssso...',
    '..ojwwwwjo..',
    '.ojjwwwwjjo.',
    '.ojjwwwwjjo.',
    '.ojj wwjjo..',
    '..oo....oo..',
  ],
}

// --- Player 2 — mint-haired fighter (bust) ---------------------------------
export const spriteP2: Sprite = {
  legend: {
    o: C.ink,
    h: C.mint,
    H: '#B8F0D4',
    s: C.skin,
    d: C.skinD,
    j: C.mintD,
    w: C.bone,
    e: C.ink,
    g: C.gold,
  },
  grid: [
    '...oooo.....',
    '..oHHHHo....',
    '.oHhhhhHo...',
    '.ohhhhhhog..',
    '.ohhhhhho...',
    '..osssss o..',
    '..oseseso...',
    '..osssss o..',
    '..odsssdo...',
    '...ossso....',
    '..ojwwwwjo..',
    '.ojjwwwwjjo.',
    '.ojjwwwwjjo.',
    '..oo....oo..',
  ],
}

// --- Silhouette for the home screen (simple standing figure) ---------------
export const spriteHero: Sprite = {
  legend: { o: C.ink, b: C.bone, c: C.cyan },
  grid: [
    '...oooo...',
    '..obbbbo..',
    '..obbbbo..',
    '...obbo...',
    '..occcco..',
    '.occcccco.',
    'oc occ cco',
    '.o occ co.',
    '...occo...',
    '..occo....',
    '..oo o....',
    '..oo.oo...',
  ],
}

// --- Padlock (locked level) -------------------------------------------------
export const spriteLock: Sprite = {
  legend: { o: C.ink, g: C.gray, y: C.gold, s: C.steel },
  grid: [
    '..oooo..',
    '.og..go.',
    '.og..go.',
    'oggggggo',
    'oyyyyyyo',
    'oyyooyyo',
    'oyyooyyo',
    'oyyyyyyo',
    'oyyyyyyo',
    '.oooooo.',
  ],
}

// --- Checkmark (completed) --------------------------------------------------
export const spriteCheck: Sprite = {
  legend: { o: C.ink, m: C.mint },
  grid: [
    '......oo',
    '.....omo',
    '....omo.',
    'o..omo..',
    'omoomo..',
    'ommmo...',
    'omo.....',
    'o.......',
  ],
}

// --- Hard hat (WIP / under construction) -----------------------------------
export const spriteHardHat: Sprite = {
  legend: { o: C.ink, y: C.gold, w: C.bone, b: C.orangeD },
  grid: [
    '...oooo...',
    '..oywwyo..',
    '.oywwwwyo.',
    'oywwwwwwyo',
    'oywwwwwwyo',
    'obbbbbbbbo',
    'oooooooooo',
  ],
}

// --- Music note + speaker (sound toggles) ----------------------------------
export const spriteNote: Sprite = {
  legend: { o: C.ink, n: C.bone },
  grid: [
    '....ooo.',
    '....onno',
    '....onno',
    '....ono.',
    '.oooono.',
    'onnoono.',
    'onnoono.',
    'oooo.o..',
  ],
}

export const spriteSpeaker: Sprite = {
  legend: { o: C.ink, n: C.bone, w: C.cyan },
  grid: [
    '....oo..',
    '..ooon.w',
    '.onnnow.',
    'onnnnow.',
    'onnnnow.',
    '.onnnow.',
    '..ooon.w',
    '....oo..',
  ],
}

// --- Heart (decorative / VS center) ----------------------------------------
export const spriteHeart: Sprite = {
  legend: { o: C.ink, r: C.red, l: '#FF7A8F' },
  grid: [
    '.oo..oo.',
    'olro oro',
    'orrrorro',
    'orrrrrro',
    'orrrrrro',
    '.orrrro.',
    '..orro..',
    '...oo...',
  ],
}

// --- Main character — the waving mascot you play as -------------------------
export const spriteMain: Sprite = {
  legend: {
    o: C.ink,
    y: C.gold, // hair + hand
    r: C.orange, // arms
    s: C.cream, // face
    w: C.white, // eyes
    p: C.violet, // pupils
    m: C.magenta, // mouth
    g: C.green, // shirt
    b: C.cyan, // legs
    u: C.purple, // shoes
  },
  grid: [
    '..y.y...........',
    '..oyo...oyyo....',
    '..oyo..oyyyyo...',
    '..oro.osssssso..',
    '..oro.owwswwso..',
    '..oro.opwspwso..',
    '..oro.osssssso..',
    '..oro.osmmmmso..',
    '..orrrosssssso..',
    '..orrogggggggo..',
    '....oggggggggoro',
    '....oggggggggoro',
    '....ogggggggorro',
    '....oggggggggo..',
    '....obbo..obbo..',
    '....obbo..obbo..',
    '....obbo..obbo..',
    '...ouuuo.ouuuo..',
    '..ouuuuo.ouuuuo.',
  ],
}

// --- Sealed envelope (Level 6 confirmation) --------------------------------
export const spriteLetter: Sprite = {
  legend: { o: C.ink, w: C.bone, r: C.red },
  grid: [
    'oooooooooo',
    'owwwwwwwwo',
    'owwoooowwo',
    'owwwoowwwo',
    'owwwwwwwwo',
    'owwrwwrwwo',
    'owwwrrwwwo',
    'oooooooooo',
  ],
}

export const allSprites = {
  p1: spriteP1,
  p2: spriteP2,
  hero: spriteHero,
  main: spriteMain,
  letter: spriteLetter,
  lock: spriteLock,
  check: spriteCheck,
  hardhat: spriteHardHat,
  note: spriteNote,
  speaker: spriteSpeaker,
  heart: spriteHeart,
}

export type SpriteName = keyof typeof allSprites
