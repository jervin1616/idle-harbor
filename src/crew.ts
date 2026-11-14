// Crew you can recruit. Each one gives a permanent bonus and walks the boardwalk once hired.
import type { StationId } from './config';

export interface Crew {
  id: string; name: string; role: string; bio: string;
  target: StationId | 'tap' | 'all';     // what the bonus applies to
  bonus: number;                         // +0.10 = +10%
  cost: number; gems?: number;           // coins and/or gems to recruit
  shirt: string; hat: 'straw' | 'cap' | 'hard' | 'crown' | 'none'; hatColor: string;
}

export const CREW: Crew[] = [
  { id: 'salty',   name: 'Old Salty',       role: 'Retired skipper',    bio: 'Talks to the fish. They seem to listen.',        target: 'dock',   bonus: 0.10, cost: 2000,    shirt: '#4aa3df', hat: 'cap',   hatColor: '#fff8e8' },
  { id: 'dex',     name: 'Dockhand Dex',    role: 'Pier builder',       bio: 'Has never once been seen sitting down.',         target: 'dock',   bonus: 0.20, cost: 120000,  shirt: '#e8603c', hat: 'hard',  hatColor: '#ffd75e' },
  { id: 'marlowe', name: 'Captain Marlowe', role: 'Legend of the pier', bio: 'Caught a boot once. Wears it with pride.',       target: 'dock',   bonus: 0.40, cost: 0, gems: 30, shirt: '#25618f', hat: 'cap',   hatColor: '#c4453a' },
  { id: 'gill',    name: 'Granny Gill',     role: 'Fillet expert',      bio: 'Her knife is faster than your eyes.',            target: 'shed',   bonus: 0.10, cost: 10000,   shirt: '#e8898a', hat: 'none',  hatColor: '#fff8e8' },
  { id: 'pierre',  name: 'Chef Pierre',     role: 'Fish chef',          bio: 'Insists every sardine is a delicacy.',           target: 'shed',   bonus: 0.20, cost: 600000,  shirt: '#fff8e8', hat: 'cap',   hatColor: '#fff8e8' },
  { id: 'fin',     name: 'Fin the Filleter', role: 'Master of the blade', bio: 'Never says a word. Never misses a bone.',      target: 'shed',   bonus: 0.40, cost: 0, gems: 30, shirt: '#2f4057', hat: 'hard',  hatColor: '#8e9ab5' },
  { id: 'pip',     name: 'Pip',             role: 'Deckhand',           bio: 'Youngest on the harbor. Loudest, too.',          target: 'fleet',  bonus: 0.10, cost: 25000,   shirt: '#9bd16b', hat: 'straw', hatColor: '#f2c14e' },
  { id: 'rosa',    name: 'First Mate Rosa', role: 'Navigator',          bio: 'Can find the fish by smell alone.',              target: 'fleet',  bonus: 0.20, cost: 1.5e6,   shirt: '#c4453a', hat: 'cap',   hatColor: '#2d1e3e' },
  { id: 'blue',    name: 'Admiral Bluebeard', role: 'Fleet commander',  bio: 'The beard is real. The title is arguable.',      target: 'fleet',  bonus: 0.40, cost: 0, gems: 40, shirt: '#5b3a6b', hat: 'crown', hatColor: '#ffd75e' },
  { id: 'mo',      name: 'Merchant Mo',     role: 'Stall keeper',       bio: 'Will sell you a fish you already caught.',       target: 'market', bonus: 0.10, cost: 60000,   shirt: '#ffd75e', hat: 'straw', hatColor: '#e8b86a' },
  { id: 'pearl',   name: 'Auntie Pearl',    role: 'Haggler',            bio: 'Nobody has ever won an argument with her.',      target: 'market', bonus: 0.20, cost: 4e6,     shirt: '#b07ae0', hat: 'none',  hatColor: '#fff8e8' },
  { id: 'coralie', name: 'Baroness Coralie', role: 'Fish connoisseur',  bio: 'Pays triple for anything sparkly.',              target: 'market', bonus: 0.40, cost: 0, gems: 40, shirt: '#e8898a', hat: 'crown', hatColor: '#fff8e8' },
  { id: 'marina',  name: 'Marina',          role: 'Rod whisperer',      bio: 'Her tap on the line is pure magic.',             target: 'tap',    bonus: 0.25, cost: 15000,   shirt: '#4fb3d6', hat: 'straw', hatColor: '#f2c14e' },
  { id: 'rod',     name: 'Rod Rodriguez',   role: 'Tackle collector',   bio: 'Owns 400 rods. Uses the same one always.',       target: 'tap',    bonus: 0.50, cost: 0, gems: 20, shirt: '#58a85a', hat: 'hard',  hatColor: '#ffd75e' },
  { id: 'biscuit', name: 'Biscuit the Cat', role: 'Harbor mascot',      bio: 'Technically in charge of everything.',           target: 'all',    bonus: 0.05, cost: 0, gems: 25, shirt: '#f28c4a', hat: 'none',  hatColor: '#fff8e8' },
];
export const crewById = (id: string) => CREW.find(c => c.id === id)!;
