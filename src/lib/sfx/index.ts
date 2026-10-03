import useSound from '@beastjs/use-sound'

export const [play, { stop }] = useSound('/sounds/menu-open.mp3')

// button(type="button" onMouseEnter={() => play()} onMouseLeave={() => stop()})
//   span(role="img" aria-label="trumpet") 🎺
