// The fish you can catch. Each species has its own sell price: the more (and better) species you unlock,
// the higher your market price index, which multiplies all income and taps.
export interface Fish {
  id: string; name: string;
  price: number;        // how much this species sells for, relative to a sardine (1)
  weight: number;       // how often it turns up among unlocked species (bigger = more common)
  color: string;        // used for the fish sprite
  gems: number;         // one-time gems the first time you catch it
  req: { dock?: number; fleet?: number; rod?: number };   // what unlocks it
  hint: string;
}

export const FISH: Fish[] = [
  { id: 'sardine',   name: 'Sardine',        price: 1,   weight: 40, color: '#c5cde0', gems: 1, req: {},            hint: 'Found right off the pier' },
  { id: 'anchovy',   name: 'Anchovy',        price: 1.5, weight: 30, color: '#8e9ab5', gems: 1, req: { dock: 6 },   hint: 'Fishing Dock level 6' },
  { id: 'perch',     name: 'Perch',          price: 2.5, weight: 28, color: '#9bd16b', gems: 2, req: { dock: 15 },  hint: 'Fishing Dock level 15' },
  { id: 'mackerel',  name: 'Mackerel',       price: 4,   weight: 24, color: '#4fb3d6', gems: 2, req: { dock: 30 },  hint: 'Fishing Dock level 30' },
  { id: 'trout',     name: 'Rainbow Trout',  price: 6,   weight: 20, color: '#e8898a', gems: 3, req: { dock: 50 },  hint: 'Fishing Dock level 50' },
  { id: 'bass',      name: 'Sea Bass',       price: 9,   weight: 16, color: '#58a85a', gems: 3, req: { dock: 75 },  hint: 'Fishing Dock level 75' },
  { id: 'cod',       name: 'Cod',            price: 5,   weight: 26, color: '#e8b86a', gems: 2, req: { fleet: 1 },  hint: 'Build the Fishing Fleet' },
  { id: 'haddock',   name: 'Haddock',        price: 8,   weight: 22, color: '#f4a99a', gems: 3, req: { fleet: 10 }, hint: 'Fishing Fleet level 10' },
  { id: 'salmon',    name: 'Salmon',         price: 12,  weight: 18, color: '#f28c4a', gems: 4, req: { fleet: 25 }, hint: 'Fishing Fleet level 25' },
  { id: 'tuna',      name: 'Bluefin Tuna',   price: 20,  weight: 12, color: '#25618f', gems: 5, req: { fleet: 45 }, hint: 'Fishing Fleet level 45' },
  { id: 'swordfish', name: 'Swordfish',      price: 35,  weight: 8,  color: '#8a4f7d', gems: 6, req: { fleet: 65 }, hint: 'Fishing Fleet level 65' },
  { id: 'marlin',    name: 'Blue Marlin',    price: 55,  weight: 5,  color: '#2f86b5', gems: 8, req: { fleet: 85 }, hint: 'Fishing Fleet level 85' },
  { id: 'puffer',    name: 'Pufferfish',     price: 7,   weight: 10, color: '#ffd75e', gems: 3, req: { rod: 2 },    hint: 'Own the Fiberglass Rod' },
  { id: 'angler',    name: 'Anglerfish',     price: 30,  weight: 5,  color: '#5b3a6b', gems: 6, req: { rod: 3 },    hint: 'Own the Carbon Rod' },
  { id: 'koi',       name: 'Golden Koi',     price: 90,  weight: 3,  color: '#ffd75e', gems: 10, req: { rod: 4 },   hint: 'Own the Golden Rod' },
  { id: 'leviathan', name: 'Leviathan Eel',  price: 150, weight: 1,  color: '#c46b7c', gems: 20, req: { rod: 5 },   hint: 'Own the Trident Rod' },
];
export const FISH_INDEX_FACTOR = 0.03;   // market price index = 0.97 + 0.03 x (sum of unlocked prices)
export const fishById = (id: string) => FISH.find(f => f.id === id)!;

// Bait: the equipped bait makes certain species much more likely to bite. It never changes what fish sell for;
// it just helps you find the ones you are missing.
export interface Bait { id: string; name: string; desc: string; cost: number; gems?: number; mult: number; targets: string[] }
export const BAITS: Bait[] = [
  { id: 'plain',  name: 'Plain Bait',      desc: 'Nothing special. Every fish is equally curious.', cost: 0, mult: 1, targets: [] },
  { id: 'worm',   name: 'Wriggly Worms',   desc: 'Anchovy, Perch, Rainbow Trout, Sea Bass',         cost: 800,     mult: 4, targets: ['anchovy', 'perch', 'trout', 'bass'] },
  { id: 'shrimp', name: 'Fresh Shrimp',    desc: 'Mackerel, Cod, Haddock, Salmon',                  cost: 8000,    mult: 4, targets: ['mackerel', 'cod', 'haddock', 'salmon'] },
  { id: 'squid',  name: 'Squid Strips',    desc: 'Bluefin Tuna, Swordfish, Blue Marlin',            cost: 250000,  mult: 5, targets: ['tuna', 'swordfish', 'marlin'] },
  { id: 'glow',   name: 'Glow Lure',       desc: 'Pufferfish, Anglerfish, Leviathan Eel',           cost: 0, gems: 15, mult: 6, targets: ['puffer', 'angler', 'leviathan'] },
  { id: 'gold',   name: 'Golden Lure',     desc: 'Golden Koi, Leviathan Eel, Blue Marlin',          cost: 0, gems: 30, mult: 8, targets: ['koi', 'leviathan', 'marlin'] },
];
export const baitById = (id: string) => BAITS.find(b => b.id === id)!;
