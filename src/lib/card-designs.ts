import type { StaticImageData } from 'next/image';
// Imported, rather than linked by path, so that Next.js adds the base path of a
// GitHub Pages deployment to the preview URLs.
import cardDesign1 from '../../public/card-designs/card-design-1.png';
import cardDesign2 from '../../public/card-designs/card-design-2.png';

export type CardDesignId = 'card-design-1' | 'card-design-2';

export interface CardDesign {
  id: CardDesignId;
  // The name of the design in the issuance constructor.
  label: string;
  // The alternative text that the wallet gets with the card art.
  altText: string;
  // The image file, relative to the public directory. The credential endpoint
  // embeds this file in its response.
  publicPath: string;
  // The same image, for the preview in the issuance constructor.
  preview: StaticImageData;
}

// The card art that the wallet shows for the issued credential. To add a
// design, add a PNG file to public/card-designs/ and an entry here. Keep the
// images about 400 pixels wide: the wallet stores the card art with the
// credential.
export const CARD_DESIGNS: CardDesign[] = [
  {
    id: 'card-design-1',
    label: 'Puppy Credit',
    altText: 'Pawsitive Tech Puppy Credit card with puppies',
    publicPath: 'card-designs/card-design-1.png',
    preview: cardDesign1,
  },
  {
    id: 'card-design-2',
    label: 'Kitty Credit',
    altText: 'Pawsitive Tech Kitty Credit card with kittens',
    publicPath: 'card-designs/card-design-2.png',
    preview: cardDesign2,
  },
];

export const DEFAULT_CARD_DESIGN: CardDesignId = CARD_DESIGNS[0].id;

/**
 * Returns the card design with the given ID. The ID comes back from the wallet
 * in `issuer_state`, so an unknown ID gets the default design.
 */
export function getCardDesign(id: unknown): CardDesign {
  return CARD_DESIGNS.find((design) => design.id === id) ?? CARD_DESIGNS[0];
}
