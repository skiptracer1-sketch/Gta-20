import {StoryChapter, VehicleTrim} from '../types/game';

const ASSET_BASE = import.meta.env.BASE_URL;

export const POSTER_ASSETS = {
  gta20Duo: `${ASSET_BASE}assets/aistudio/file_0000000087d081f5b906ecd062ae4c83_2828f907.png`,
  crazyEVegas: `${ASSET_BASE}assets/aistudio/file_00000000db7081f598eaec92390beddf_3fd9c0fe.png`,
  worldstarTrio: `${ASSET_BASE}assets/aistudio/Screenshot_20261113_212935_Google_1c223eae.jpg`,
};

export const VEHICLE_TRIMS: VehicleTrim[] = [
  {
    id: 'spectre-2046',
    name: 'Spectre 2046',
    subtitle: 'Lumexus Tech Interceptor · Stock Frame',
    primaryColor: '#0F172A',
    accentColor: '#06B6D4',
    cost: 0,
    topSpeedBonus: 0,
  },
  {
    id: 'vegas-volt',
    name: 'Vegas Volt XX',
    subtitle: 'Crazy E Neon Edition · Twin Thruster',
    primaryColor: '#1E1B4B',
    accentColor: '#EC4899',
    cost: 1200,
    topSpeedBonus: 14,
  },
  {
    id: 'dean-cruiser',
    name: 'Quad Enforcer',
    subtitle: 'Campus Security Spec · Heavy Shield',
    primaryColor: '#18181B',
    accentColor: '#F59E0B',
    cost: 2400,
    topSpeedBonus: 22,
  },
  {
    id: 'lumexus-gold',
    name: 'Lumexus Apex',
    subtitle: '2046 Preorder Prototype · Max Turbine',
    primaryColor: '#090D16',
    accentColor: '#38BDF8',
    cost: 4000,
    topSpeedBonus: 34,
  },
];

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'ch1',
    number: 'Chapter 01',
    title: 'Midnight Tuition Run',
    district: 'Lumexus Tech Quad · 2046',
    summary:
      'Finals lock in thirty minutes. Vex and Kira have to bypass the Dean’s encrypted server vault and outrun Quad Security hover-patrols.',
    coverImage: POSTER_ASSETS.gta20Duo,
    rewardCredits: 1500,
    rewardRep: 350,
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'Kira',
        role: 'Cyber-Engineering Senior',
        line: 'Smart-lenses just flagged Dean Vance’s lockdown sweep across the North Quad. Our tuition ledger and lab keys are trapped behind Node 20.',
        choices: [
          {
            label: 'Breach the Quad Firewall right now',
            nextNodeId: 'n2_hack',
            repDelta: 100,
            launchMinigame: 'firewall',
          },
          {
            label: 'Grab a hover-coupe and run the perimeter',
            nextNodeId: 'n2_drive',
            creditsDelta: 250,
          },
        ],
      },
      n2_hack: {
        id: 'n2_hack',
        speaker: 'Vex',
        role: 'Neo-Campus Runner',
        line: 'Node 20 is cracked wide open, and every scholarship credit just bounced back to the student pool. Security drones are scrambling from the clocktower.',
        choices: [
          {
            label: 'Drop into 2D Campus to lose the heat',
            nextNodeId: 'n3_end',
            creditsDelta: 500,
            launchMode: 'campus2d',
          },
          {
            label: 'Take the overpass straight to Neo-Vegas',
            nextNodeId: 'n3_end',
            repDelta: 150,
          },
        ],
      },
      n2_drive: {
        id: 'n2_drive',
        speaker: 'Kira',
        role: 'Cyber-Engineering Senior',
        line: 'Smart call. The Quad skybridge has zero drone coverage until midnight, and Crazy E left a tuned Spectre waiting by the East Dorms.',
        choices: [
          {
            label: 'Launch 3D Vegas Hover-Drive getaway',
            nextNodeId: 'n3_end',
            repDelta: 150,
            launchMode: 'drive3d',
          },
          {
            label: 'Cash out the dorm drop and lay low',
            nextNodeId: 'n3_end',
            creditsDelta: 400,
          },
        ],
      },
      n3_end: {
        id: 'n3_end',
        speaker: 'Vex',
        role: 'Neo-Campus Runner',
        line: 'Exams cleared, patrol radar jammed, and the neon lights of the Vegas Strip are dead ahead. Welcome to GTA 20.',
        choices: [],
      },
    },
  },
  {
    id: 'ch2',
    number: 'Chapter 02',
    title: 'The Crazy E Vegas Strip',
    district: 'Neo-Las Vegas Boulevard · 2046',
    summary:
      'Crazy E’s underground Lumexus Arcade is hosting the midnight hover-sprint beneath the Stratosphere spire—until corporate enforcers crash the strip.',
    coverImage: POSTER_ASSETS.crazyEVegas,
    rewardCredits: 2200,
    rewardRep: 500,
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'Crazy E',
        role: 'Lumexus Vegas Promoter',
        line: 'Look at that skyline. Half the college crowd bet their semester crypto on the Strip Drift tonight. Enforcers blocked the main boulevard—we improvise.',
        choices: [
          {
            label: 'Run the Neon Hover-Drift Sprint',
            nextNodeId: 'n2_win',
            repDelta: 200,
            launchMinigame: 'drift',
          },
          {
            label: 'Cut through the Stratosphere service alley',
            nextNodeId: 'n2_alley',
            creditsDelta: 400,
          },
        ],
      },
      n2_win: {
        id: 'n2_win',
        speaker: 'Crazy E',
        role: 'Lumexus Vegas Promoter',
        line: 'Cleanest run in 2046! The crowd’s losing it and the Lumexus vault payout is yours. Ready to push the interceptor past Mach-1?',
        choices: [
          {
            label: 'Hit the Strip in 3D Hover-Drive',
            nextNodeId: 'n3_end',
            creditsDelta: 600,
            launchMode: 'drive3d',
          },
          {
            label: 'Collect prize pool and prep Chapter 3',
            nextNodeId: 'n3_end',
            repDelta: 200,
          },
        ],
      },
      n2_alley: {
        id: 'n2_alley',
        speaker: 'Kira',
        role: 'Cyber-Engineering Senior',
        line: 'Alleyway sensors were offline just like you predicted. We bypassed three patrol blocks and tagged every relay tower on the Strip.',
        choices: [
          {
            label: 'Hack the Vegas relay node',
            nextNodeId: 'n3_end',
            creditsDelta: 650,
            launchMinigame: 'firewall',
          },
          {
            label: 'Lock in the Vegas Strip win',
            nextNodeId: 'n3_end',
            repDelta: 250,
          },
        ],
      },
      n3_end: {
        id: 'n3_end',
        speaker: 'Crazy E',
        role: 'Lumexus Vegas Promoter',
        line: 'From campus dorms to the Vegas Strip, Lumexus Gaming owns the night.',
        choices: [],
      },
    },
  },
  {
    id: 'ch3',
    number: 'Chapter 03',
    title: 'Preorder Pandemonium',
    district: 'Global Launch Hub · Neo-Vegas & Quad',
    summary:
      'GTA 20 just shattered every preorder record on Campus Wire. Rival syndicates are trying to hijack the Lumexus launch servers before midnight.',
    coverImage: POSTER_ASSETS.worldstarTrio,
    rewardCredits: 3500,
    rewardRep: 850,
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'Jett',
        role: 'Hardware Tactician',
        line: 'Preorder traffic just crossed ten million units and rival hackers are flooding our campus uplink. We hold the server roof together.',
        choices: [
          {
            label: 'Lock down the Mainframe Firewall',
            nextNodeId: 'n2_defend',
            repDelta: 300,
            launchMinigame: 'firewall',
          },
          {
            label: 'Intercept the physical convoy in 2D District',
            nextNodeId: 'n2_convoy',
            creditsDelta: 800,
            launchMode: 'campus2d',
          },
        ],
      },
      n2_defend: {
        id: 'n2_defend',
        speaker: 'Vex',
        role: 'Neo-Campus Runner',
        line: 'Uplink stabilized at 100%. Every pre-order key is verified and Crazy E just greenlit the full city free-roam.',
        choices: [
          {
            label: 'Celebrate with a Neon Hover-Drift run',
            nextNodeId: 'n3_end',
            creditsDelta: 1000,
            launchMinigame: 'drift',
          },
          {
            label: 'Claim Launch Champion bonus',
            nextNodeId: 'n3_end',
            repDelta: 400,
          },
        ],
      },
      n2_convoy: {
        id: 'n2_convoy',
        speaker: 'Kira',
        role: 'Cyber-Engineering Senior',
        line: 'Convoy stopped dead at the South Quad gate. The launch build is live across web and mobile.',
        choices: [
          {
            label: 'Claim Launch Champion bonus',
            nextNodeId: 'n3_end',
            creditsDelta: 1000,
          },
        ],
      },
      n3_end: {
        id: 'n3_end',
        speaker: 'Crazy E',
        role: 'Lumexus Gaming',
        line: 'Chapter complete. Full Neo-Campus and Vegas Strip free-roam is yours—keep stacking Tuition Credits and beating your record.',
        choices: [],
      },
    },
  },
];

export function getCampusRank(rep: number): string {
  if (rep >= 2500) return '2046 Legend';
  if (rep >= 1500) return 'Vegas Syndicate';
  if (rep >= 800) return 'Quad Phantom';
  if (rep >= 350) return 'Night Runner';
  return 'Freshman Runner';
}
