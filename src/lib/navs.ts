import type { IconName } from '@/lib/icons/types'

export type NavItem = {
  href: string
  icon: IconName
  label: string
  value: string
  tags: string[]
  description?: string
  short?: string
  disabled?: boolean
}

export type NavGroup = {
  title: string
  items: NavItem[]
  label?: string
}
export const navGroups: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      {
        href: '/',
        value: 'launcher',
        icon: 'new-folder',
        label: 'Launcher',
        short: 'launcher',
        description: 'Launcher',
        tags: ['create', 'new file', 'new folder']
      },
      {
        href: '/converters',
        icon: 'mechanics',
        label: 'Converters',
        short: 'Converters',
        description: 'Media Converters',
        value: 'converters',
        tags: ['converters', 'images', 'audio', 'videos']
      },
      {
        href: '/icons',
        icon: 'new-folder',
        label: 'Icons',
        short: 'Icons',
        description: 'My Icons',
        value: 'icons',
        tags: ['icons']
      },
      {
        href: '/gym',
        icon: 'arrow-left',
        label: 'Gym',
        short: 'Gym',
        description: 'My Gym',
        value: 'gym',
        tags: ['gym']
      }
    ]
  },
  {
    title: 'Resources',
    items: [
      {
        href: 'https://beast-docs-adv.beastjs.workers.dev',
        icon: 'beast',
        label: 'Beast Docs',
        short: 'Beast Docs',
        description: 'Beast Developer Docs',
        value: 'beast-docs',
        tags: ['beast', 'docs']
      }
    ]
  }
]

export const branches: NavGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        short: 'install',
        value: 'install',
        href: 'install',
        label: 'Installation',
        icon: 'folder',
        description: 'settings',
        tags: ['tags']
      },
      {
        short: 'quick',
        value: 'quick',
        href: 'quick',
        label: 'Quick start',
        icon: 'folder',
        description: 'settings',
        tags: ['tags']
      },
      {
        short: 'config',
        value: 'config',
        href: 'config',
        label: 'Configuration',
        icon: 'folder',
        description: 'settings',
        tags: ['tags']
      }
    ]
  },
  {
    title: 'Components',
    items: [
      {
        short: 'buttons',
        value: 'buttons',
        href: 'buttons',
        label: 'Buttons',
        icon: 'folder',
        description: 'settings',
        tags: ['tags']
      },
      {
        short: 'overlays',
        value: 'overlays',
        href: 'overlays',
        label: 'Overlays',
        icon: 'folder',
        description: 'settings',
        tags: ['tags']
      }
    ]
  }
]
