export interface Archetype {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'alchemist',
    name: 'The Alchemist',
    description: 'Transforms elements into gold, seeking the philosopher\'s stone of knowledge.',
    image: '/assets/archetypes/alchemist.svg',
    color: '#ffd700',
  },
  {
    id: 'weaver',
    name: 'The Weaver',
    description: 'Interlaces threads of thought, creating tapestries of understanding.',
    image: '/assets/archetypes/weaver.svg',
    color: '#9370db',
  },
  {
    id: 'trickster',
    name: 'The Trickster',
    description: 'Challenges assumptions, revealing new perspectives through clever disruption.',
    image: '/assets/archetypes/trickster.svg',
    color: '#ff6b6b',
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    description: 'Ventures into uncharted territories of thought, mapping new intellectual landscapes.',
    image: '/assets/archetypes/explorer.svg',
    color: '#4ecdc4',
  },
  {
    id: 'sage',
    name: 'The Sage',
    description: 'Draws upon ancient wisdom, seeking timeless truths in the patterns of knowledge.',
    image: '/assets/archetypes/sage.svg',
    color: '#a8e6cf',
  },
  {
    id: 'synthesist',
    name: 'The Synthesist',
    description: 'Harmonizes opposing viewpoints, creating new understanding from diverse perspectives.',
    image: '/assets/archetypes/synthesist.svg',
    color: '#ff9f1c',
  },
]; 