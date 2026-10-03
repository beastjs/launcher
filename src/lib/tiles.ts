export const HEX_WIDTH = 136 // Overall width of the hexagon (point to point)
export const HEX_HEIGHT = 75 // Overall height of the hexagon (flat to flat)
export const GAP = 4 // Gap between hexagons
export const HEX_ROW_STEP = (HEX_HEIGHT + GAP) / 2
export const HEX_X_GAP = 18
export const HEX_COL_STEP = HEX_WIDTH + HEX_X_GAP
export const HEX_STAGGER_OFFSET = HEX_COL_STEP / 2

export interface Tile {
  id: number
  label: string
  description: string
  href: string
  icon: string
  posX: number
  posY: number
}

const social: Tile[] = [
  {
    id: 0,
    label: 'x.com',
    description: 'Social media platform for real-time updates and discussions',
    href: 'https://x.com',
    icon: 'twitter-x',
    posX: 101,
    posY: 98
  },
  {
    id: 1,
    label: 'youtube',
    description: 'Video sharing and streaming platform',
    href: 'https://youtube.com',
    icon: 'youtube',
    posX: 180,
    posY: 98
  },
  {
    id: 2,
    label: 'github',
    description: 'Code hosting and version control platform',
    href: 'https://github.com',
    icon: 'github',
    posX: 259,
    posY: 98
  },
  {
    id: 3,
    label: 'coderabbit',
    description: 'AI-powered code review assistant',
    href: 'https://coderabbit.ai',
    icon: 'coderabbit',
    posX: 151,
    posY: 124
  },
  {
    id: 4,
    label: 'c.ai',
    description: 'Character-based AI chat platform',
    href: 'https://character.ai/',
    icon: 'catgirl',
    posX: 230,
    posY: 124
  },
  {
    id: 5,
    label: 'box',
    description: 'Cloud storage and file sharing service',
    href: 'https://app.box.com/folder/0',
    icon: 'box-dot-com',
    posX: 309,
    posY: 124
  },
  {
    id: 6,
    label: 'claude',
    description: 'AI assistant by Anthropic for helpful conversations',
    href: 'https://claude.ai',
    icon: 'claude',
    posX: 101,
    posY: 150
  },
  {
    id: 7,
    label: 'chatgpt',
    description: "OpenAI's conversational AI assistant",
    href: 'https://chatgpt.com',
    icon: 'openai',
    posX: 180,
    posY: 150
  },
  {
    id: 8,
    label: 'grok',
    description: "X's AI assistant with real-time information",
    href: 'https://grok.com',
    icon: 'grok',
    posX: 259,
    posY: 150
  },
  {
    id: 9,
    label: 't3',
    description: 'Type-safe full-stack web development stack',
    href: 'https://t3.chat',
    icon: 't3',
    posX: 151,
    posY: 176
  },
  {
    id: 10,
    label: 'phind',
    description: 'AI-powered search engine for developers',
    href: 'https://www.phind.com/',
    icon: 'sparkle',
    posX: 230,
    posY: 176
  },
  {
    id: 11,
    label: 'perplexity',
    description: 'AI-powered research and answer engine',
    href: 'https://www.perplexity.ai/',
    icon: 'perplexity',
    posX: 309,
    posY: 176
  },
  {
    id: 12,
    label: 'mdn',
    description: 'Mozilla Developer Network - web development docs',
    href: 'https://developer.mozilla.org/en-US/',
    icon: 'mdn',
    posX: 401,
    posY: 148
  },
  {
    id: 13,
    label: 'News',
    description: 'Hacker News - tech news and discussions',
    href: 'https://news.ycombinator.com/',
    icon: 'ycombinator',
    posX: 429,
    posY: 176
  }
]

const frontend: Tile[] = [
  {
    id: 0,
    label: 'vercel',
    description: 'Frontend deployment and hosting platform',
    href: 'https://www.vercel.com/',
    icon: 'vercel',
    posX: 151,
    posY: 500
  },
  {
    id: 1,
    label: 'shadcn',
    description: 'React component library with Tailwind CSS',
    href: 'https://ui.shadcn.com/',
    icon: 'shadcn',
    posX: 230,
    posY: 500
  },
  {
    id: 2,
    label: 'nextui',
    description: 'Beautiful React UI library with modern design',
    href: 'https://nextui.org/',
    icon: 'nextui',
    posX: 309,
    posY: 500
  },
  {
    id: 3,
    label: 'origin',
    description: 'Premium UI components and templates',
    href: 'https://originui.com/',
    icon: 'origin',
    posX: 101,
    posY: 525
  },
  {
    id: 4,
    label: 'aceternity',
    description: 'Modern UI components with stunning animations',
    href: 'https://ui.aceternity.com/',
    icon: 'map-arrow-up',
    posX: 180,
    posY: 525
  },
  {
    id: 5,
    label: 'magic',
    description: 'React components with framer-motion animations',
    href: 'https://magicui.design/',
    icon: 'magic-wand',
    posX: 259,
    posY: 525
  },
  {
    id: 6,
    label: 'heroicons',
    description: 'Beautiful hand-crafted SVG icons by Tailwind',
    href: 'https://heroicons.com/',
    icon: 'hero',
    posX: 151,
    posY: 552
  },
  {
    id: 7,
    label: 'lucide',
    description: 'Simple and beautiful open source icon library',
    href: 'https://lucide.dev/',
    icon: 'lucide',
    posX: 230,
    posY: 552
  },
  {
    id: 8,
    label: 'dribbble',
    description: 'Design inspiration and creative community',
    href: 'https://dribbble.com/',
    icon: 'dribbble',
    posX: 309,
    posY: 552
  },
  {
    id: 9,
    label: 'tailwind',
    description: 'Utility-first CSS framework for rapid development',
    href: 'https://tailwindcss.com/',
    icon: 'tailwind',
    posX: 338,
    posY: 525
  },
  {
    id: 10,
    label: 'icones',
    description: 'Icon explorer with over 150,000 open source icons',
    href: 'https://icones.js.org/',
    icon: 'info-outline',
    posX: 101,
    posY: 577
  },
  {
    id: 11,
    label: 'expo',
    description: 'Platform for universal React applications',
    href: 'https://docs.expo.dev/',
    icon: 'expo',
    posX: 180,
    posY: 577
  },
  {
    id: 12,
    label: 'Cult UI',
    description: 'Components for Design Engineers',
    href: 'https://cult-ui.com/',
    icon: 'cult-ui',
    posX: 259,
    posY: 577
  },
  {
    id: 13,
    label: 'Kokonut UI',
    description: 'Collection of stunning components.',
    href: 'https://kokonutui.com/',
    icon: 'kokonut-ui',
    posX: 338,
    posY: 577
  },
  {
    id: 14,
    label: 'Fancy Components*',
    description: 'Collection of fun and weird, ready-to-use components and microinteractions',
    href: 'https://www.fancycomponents.dev/',
    icon: 'fancy-components',
    posX: 151,
    posY: 604
  },
  {
    id: 15,
    label: 'Badtz UI',
    description: 'UI library for React developers.',
    href: 'https://www.badtz-ui.com/',
    icon: 'badtz-ui',
    posX: 230,
    posY: 604
  },
  {
    id: 16,
    label: 'Animate UI',
    description: 'Elevate your UI with fluid, animated components',
    href: 'https://animate-ui.com/',
    icon: 'animate-ui',
    posX: 309,
    posY: 604
  },
  {
    id: 17,
    label: 'React Bits',
    description: 'React components for creative developers',
    href: 'https://reactbits.dev/',
    icon: 'react-bits',
    posX: 388,
    posY: 604
  }
]

export const backend: Tile[] = [
  {
    id: 0,
    col: 1,
    sector: 2,
    row: 'top',
    label: 'firebase',
    description: "Google's backend-as-a-service platform",
    href: 'https://console.firebase.google.com/u/0/',
    icon: 'firebase'
  },
  {
    id: 1,
    col: 2,
    sector: 2,
    row: 'top',
    label: 'convex',
    description: 'Real-time backend for modern applications',
    href: 'https://dashboard.convex.dev',
    icon: 'cloud-lightning'
  },
  {
    id: 2,
    col: 3,
    sector: 2,
    row: 'top',
    label: 'doctl',
    description: 'DigitalOcean cloud infrastructure platform',
    href: 'https://cloud.digitalocean.com/',
    icon: 'doctl'
  },
  {
    id: 3,
    col: 4,
    sector: 2,
    row: 'top',
    label: 'sepolia',
    description: 'Google Sepolia Faucet',
    href: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    icon: 'ethereum'
  },
  {
    id: 4,
    sector: 2,
    row: 'middle',
    col: 1,
    label: 'redis',
    description: 'In-memory data structure store and cache',
    href: 'https://cloud.redis.io/',
    icon: 'redis'
  },
  {
    id: 5,
    col: 2,
    sector: 2,
    row: 'middle',
    label: 'gcp',
    description: 'Google Cloud Platform services',
    href: 'https://console.cloud.google.com/',
    icon: 'gcp'
  },
  {
    id: 6,
    col: 3,
    sector: 2,
    row: 'middle',
    label: 'supabase',
    description: 'Open source Firebase alternative with PostgreSQL',
    href: 'https://supabase.com/dashboard/projects',
    icon: 'supabase'
  },
  {
    id: 10,
    col: 4,
    sector: 2,
    row: 'middle',
    label: 'cloudinary',
    description: 'Cloudinary',
    href: 'https://console.cloudinary.com/app',
    icon: 'cloudinary',
    posX: 338,
    posY: 326
  },
  {
    id: 9,
    col: 5,
    sector: 2,
    row: 'middle',
    label: '3000',
    description: 'Local development server (HTTPS)',
    href: 'https://localhost:3000',
    icon: 'secured-server'
  },
  {
    id: 7,
    col: 2,
    sector: 2,
    row: 'bottom',
    label: 'v0',
    description: 'AI-powered UI component generator by Vercel',
    href: 'http://v0.dev',
    icon: 'v0'
  },
  {
    id: 8,
    col: 3,
    sector: 2,
    row: 'bottom',
    label: '3000',
    description: 'Local development server (HTTP)',
    href: 'http://localhost:3000',
    icon: 'localhost'
  },
  {
    id: 12,
    col: 4,
    sector: 2,
    row: 'bottom',
    label: '3001',
    description: 'Alternative local development server (HTTP)',
    href: 'http://localhost:3001',
    icon: 'localhost'
  },
  {
    id: 13,
    col: 5,
    sector: 2,
    row: 'bottom',
    label: '3001',
    description: 'Alternative local development server (HTTPS)',
    href: 'https://localhost:3001',
    icon: 'secured-server'
  }
]

const makeHexTiles = (
  prefix: string,
  items: Tile[],
  rows: number[][],
  origin: { x: number; y: number },
  offsetRows: 'even' | 'odd'
): Tile[] => {
  const itemById = new Map(items.map((item) => [item.id, item]))

  return rows.flatMap((row, rowIndex) => {
    const isOffsetRow = offsetRows === 'even' ? rowIndex % 2 === 0 : rowIndex % 2 === 1

    return row.map((id, colIndex) => {
      const item = itemById.get(id)

      if (!item) {
        throw new Error(`Missing ${prefix} tile with id ${id}`)
      }

      return {
        ...item,
        tileId: `${prefix}-${item.id}`,
        posX: origin.x + colIndex * HEX_COL_STEP + (isOffsetRow ? HEX_STAGGER_OFFSET : 0),
        posY: origin.y + rowIndex * HEX_ROW_STEP
      }
    })
  })
}

export const tiles: Tile[] = [
  ...makeHexTiles(
    'social',
    social,
    [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8, 12],
      [9, 10, 11, 13]
    ],
    { x: 100, y: 98 },
    'odd'
  ),
  ...makeHexTiles(
    'backend',
    backend,
    [
      [0, 1, 2, 3],
      [4, 5, 6, 10, 9],
      [7, 8, 12, 13]
    ],
    { x: 100, y: 302 },
    'even'
  ),
  ...makeHexTiles(
    'frontend',
    frontend,
    [
      [0, 1, 2],
      [3, 4, 5, 9],
      [6, 7, 8],
      [10, 11, 12, 13],
      [14, 15, 16, 17]
    ],
    { x: 100, y: 500 },
    'even'
  )
]
