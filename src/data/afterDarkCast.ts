/**
 * Stylized original characters inspired by the supplied Dunar Wireless ensemble poster.
 * These are visual/gameplay placeholders, not verified likenesses of the people pictured.
 * Big Red remains the default story protagonist.
 */
export type CrewAppearance = {
  skin: number;
  hair: number;
  hairShadow: number;
  jacket: number;
  accent: number;
  trim: number;
  longHair: boolean;
  beard?: boolean;
  cap?: boolean;
};

export type CrewMember = {
  id: string;
  name: string;
  role: string;
  appearance: CrewAppearance;
};

export const AFTER_DARK_CAST: CrewMember[] = [
  {id: 'big-red', name: 'Big Red', role: 'Lead · Vegas legend', appearance: {skin: 0xe8ae91, hair: 0xe63e19, hairShadow: 0x9c210d, jacket: 0x0b0e18, accent: 0xc4152d, trim: 0x45eaff, longHair: true}},
  {id: 'the-captain', name: 'The Captain', role: 'Crew founder · The muscle', appearance: {skin: 0xae7257, hair: 0x241d22, hairShadow: 0x151016, jacket: 0x0a1120, accent: 0x2c79bd, trim: 0x49ccff, longHair: false, beard: true, cap: true}},
  {id: 'golden-ace', name: 'Golden Ace', role: 'Crew founder · The closer', appearance: {skin: 0xf3c4a3, hair: 0xf6ca68, hairShadow: 0xc59043, jacket: 0x17131a, accent: 0xb28c41, trim: 0xfde68a, longHair: true}},
  {id: 'night-operator', name: 'Night Operator', role: 'Street intelligence', appearance: {skin: 0xbb816b, hair: 0x211827, hairShadow: 0x120c19, jacket: 0x11101f, accent: 0x8b5cf6, trim: 0xc4b5fd, longHair: true}},
  {id: 'the-signal', name: 'The Signal', role: 'Tech and surveillance', appearance: {skin: 0xb78d77, hair: 0x302b2e, hairShadow: 0x151219, jacket: 0x111725, accent: 0x345ea2, trim: 0x35e4ff, longHair: false, beard: true}},
  {id: 'velvet-v', name: 'Velvet V', role: 'Nightlife connections', appearance: {skin: 0xdba189, hair: 0x37202f, hairShadow: 0x1d101f, jacket: 0x1e0e1b, accent: 0xdb2777, trim: 0xfb7185, longHair: true}},
  {id: 'neon-shadow', name: 'Neon Shadow', role: 'Recon and pursuit', appearance: {skin: 0x805743, hair: 0x13151f, hairShadow: 0x080910, jacket: 0x101621, accent: 0x0d9488, trim: 0x5eead4, longHair: false, beard: true}},
  {id: 'rose-runner', name: 'Rose Runner', role: 'Courier and racer', appearance: {skin: 0xe0a58f, hair: 0x9d425a, hairShadow: 0x63243b, jacket: 0x150f1c, accent: 0xbe123c, trim: 0xf9a8d4, longHair: true}},
  {id: 'strip-guardian', name: 'Strip Guardian', role: 'The getaway specialist', appearance: {skin: 0xcca284, hair: 0x231d19, hairShadow: 0x110e0c, jacket: 0x12161e, accent: 0x8a7550, trim: 0xffd78c, longHair: false}},
  {id: 'midnight-star', name: 'Midnight Star', role: 'Undercover performer', appearance: {skin: 0x9e6a57, hair: 0x27202a, hairShadow: 0x17101b, jacket: 0x120f1e, accent: 0x972bb1, trim: 0xf0abfc, longHair: true}},
];

export const DEFAULT_CREW_MEMBER = AFTER_DARK_CAST[0];
