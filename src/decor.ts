// Cosmetics you can buy for the beach and boardwalk. Purely visual: no income effect.
export type DecorKind = 'beach' | 'boardwalk' | 'sand' | 'planks';
export interface DecorItem { id: string; name: string; desc: string; cost: number; gems?: number; kind: DecorKind; skin?: number }   // cost = coins, gems = gems (an item can need either or both)

export const DECOR: DecorItem[] = [
  { id: 'shells',     kind: 'beach', name: 'Shells and Starfish', desc: 'Washed up on the sand',          cost: 400 },
  { id: 'sandcastle', kind: 'beach', name: 'Sandcastle',          desc: 'Built with care',                cost: 1500 },
  { id: 'umbrella',   kind: 'beach', name: 'Beach Umbrella',      desc: 'With a striped towel',           cost: 4000 },
  { id: 'palm',       kind: 'beach', name: 'Palm Tree',           desc: 'Sways in the sea breeze',        cost: 0, gems: 15 },
  { id: 'beachball',  kind: 'beach', name: 'Beach Ball',          desc: 'Someone left it behind',         cost: 25000 },
  { id: 'driftwood',  kind: 'beach', name: 'Driftwood Log',       desc: 'A good place to sit',            cost: 60000 },
  { id: 'planters',   kind: 'boardwalk', name: 'Flower Planters', desc: 'Pops of color',                  cost: 2500 },
  { id: 'bench',      kind: 'boardwalk', name: 'Park Bench',      desc: 'Watch the boats go by',          cost: 8000 },
  { id: 'lamp',       kind: 'boardwalk', name: 'Lamp Post',       desc: 'Warm light at dusk',             cost: 0, gems: 20 },
  { id: 'fairy',      kind: 'boardwalk', name: 'Fairy Lights',    desc: 'Twinkle along the boardwalk',    cost: 0, gems: 25 },
  { id: 'picnic',     kind: 'boardwalk', name: 'Picnic Table',    desc: 'Lunch with a view',              cost: 150000 },
  { id: 'rack',       kind: 'boardwalk', name: 'Fish Drying Rack', desc: 'Catch of the day',              cost: 400000 },
  { id: 'anchor',     kind: 'boardwalk', name: 'Giant Anchor',    desc: 'A harbor landmark',              cost: 0, gems: 40 },
  { id: 'chest',      kind: 'boardwalk', name: 'Treasure Chest',  desc: 'Full of gold',                   cost: 0, gems: 60 },
  { id: 'flag',       kind: 'boardwalk', name: 'Harbor Flag',     desc: 'Flies high over the town',       cost: 0, gems: 80 },
  { id: 'sand_pink',  kind: 'sand', skin: 1, name: 'Pink Sand',    desc: 'Coral beach',                    cost: 5000 },
  { id: 'sand_white', kind: 'sand', skin: 2, name: 'White Sand',   desc: 'Tropical shore',                 cost: 0, gems: 20 },
  { id: 'plank_white', kind: 'planks', skin: 1, name: 'Whitewashed Planks', desc: 'Bright and breezy',     cost: 15000 },
  { id: 'plank_dark',  kind: 'planks', skin: 2, name: 'Dark Oak Planks',    desc: 'Rich and old',          cost: 0, gems: 30 },
];

export const SAND_SKINS = [
  { name: 'Golden Sand', color: '#f5dfa6' }, { name: 'Pink Sand', color: '#f4b8b0' }, { name: 'White Sand', color: '#fff1e0' },
];
export const PLANK_SKINS = [
  { name: 'Weathered Planks', color: '#b9803f', seam: 'rgba(45,30,62,.35)' },
  { name: 'Whitewashed Planks', color: '#e8d9b5', seam: 'rgba(90,70,60,.35)' },
  { name: 'Dark Oak Planks', color: '#7a4b2a', seam: 'rgba(27,20,36,.5)' },
];
export const decorById = (id: string) => DECOR.find(d => d.id === id)!;
