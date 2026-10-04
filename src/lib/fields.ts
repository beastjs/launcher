// ============================================
// Vector Field Animation - TypeScript
// ============================================

export type FieldType = 'taylor' | 'vortex' | 'flow'

interface Vector2 {
  x: number
  y: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
}

export class VectorFieldAnimation {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private width = 0
  private height = 0
  private readonly onResize = () => this.resize()
  private animationId: number | null = null

  // Configuration
  private config = {
    particleCount: 600,
    particleSpeed: 1.5,
    fadeRate: 0.015,
    spawnRate: 10, // particles per frame
    trailLength: 0.42, // 0-1, higher = longer trails
    fieldScale: 0.008, // zoom factor for field pattern
    colorSpeed: 0.0005 // hue rotation speed
  }

  private time = 0
  private hue = 0

  constructor(target: HTMLCanvasElement | string) {
    const canvas = typeof target === 'string' ? (document.getElementById(target) as HTMLCanvasElement | null) : target
    if (!canvas) throw new Error(`Canvas #${target} not found`)

    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Could not get 2D context')
    this.ctx = ctx

    this.resize()
    window.addEventListener('resize', this.onResize)

    // Initialize with some particles
    this.seedParticles()
  }

  private resize(): void {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
  }

  // ============================================
  // VECTOR FIELD DEFINITIONS
  // ============================================

  // Taylor-Green vortex lattice
  private taylorGreenField(x: number, y: number, t: number): Vector2 {
    const scale = this.config.fieldScale
    const sx = x * scale
    const sy = y * scale

    // Time-varying rotation for dynamic feel
    const phase = t * 0.00024

    return {
      x: Math.sin(sx + phase) * Math.cos(sy),
      y: -Math.cos(sx) * Math.sin(sy + phase)
    }
  }

  // Alternative: Spiral/vortex field
  private vortexField(x: number, y: number, t: number): Vector2 {
    const cx = this.width / 2
    const cy = this.height / 2
    const dx = x - cx
    const dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.001

    // Spiral outward with rotation
    const angle = Math.atan2(dy, dx) + t * 0.0002
    const strength = 100 / (dist + 50)

    return {
      x: (-dy / dist) * strength + (dx / dist) * strength * 0.013,
      y: (dx / dist) * strength + (dy / dist) * strength * 0.013
    }
  }

  // Alternative: Noise-like flow field
  private flowField(x: number, y: number, t: number): Vector2 {
    const scale = 0.005
    const nx = x * scale
    const ny = y * scale
    const nt = t * 0.0002

    // Superposition of sine waves creates organic flow
    const angle =
      Math.sin(nx + nt) * Math.cos(ny) + Math.sin(nx * 0.5 - nt * 0.7) * 0.5 + Math.cos(ny * 0.3 + nt * 0.5) * 0.3

    const speed = 1
    return {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    }
  }

  // Select which field to use
  private getField = this.taylorGreenField.bind(this)

  // ============================================
  // PARTICLE SYSTEM
  // ============================================

  private createParticle(): Particle {
    // Spawn particles in a grid pattern initially, then randomly
    const spawnRandom = Math.random() > 0.25

    let x: number, y: number
    if (spawnRandom) {
      x = Math.random() * this.width
      y = Math.random() * this.height
    } else {
      // Grid spawn for structured initial pattern
      const cols = 20
      const rows = Math.floor((cols * this.height) / this.width)
      const col = Math.floor(Math.random() * cols)
      const row = Math.floor(Math.random() * rows)
      x = ((col + 0.5) * this.width) / cols
      y = ((row + 0.5) * this.height) / rows
    }

    const life = 1 + Math.random() * 2 // 1-3 seconds at 60fps
    const hue = (this.hue + Math.random() * 60) % 360

    return {
      x,
      y,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      color: `hsla(${hue}, 80%, 60%,`
    }
  }

  private seedParticles(): void {
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push(this.createParticle())
    }
  }

  // ============================================
  // INTEGRATION (RK4 for smooth paths)
  // ============================================

  private integrateRK4(p: Particle, dt: number): void {
    const k1 = this.getField(p.x, p.y, this.time)
    const k2 = this.getField(p.x + k1.x * dt * 0.5, p.y + k1.y * dt * 0.5, this.time + dt * 0.5)
    const k3 = this.getField(p.x + k2.x * dt * 0.5, p.y + k2.y * dt * 0.5, this.time + dt * 0.5)
    const k4 = this.getField(p.x + k3.x * dt, p.y + k3.y * dt, this.time + dt)

    const vx = (k1.x + 2 * k2.x + 2 * k3.x + k4.x) / 6
    const vy = (k1.y + 2 * k2.y + 2 * k3.y + k4.y) / 6

    p.vx = vx * this.config.particleSpeed
    p.vy = vy * this.config.particleSpeed
    p.x += p.vx * dt
    p.y += p.vy * dt
  }

  // Simple Euler for comparison (faster but less accurate)
  private integrateEuler(p: Particle, dt: number): void {
    const v = this.getField(p.x, p.y, this.time)
    p.vx = v.x * this.config.particleSpeed
    p.vy = v.y * this.config.particleSpeed
    p.x += p.vx * dt
    p.y += p.vy * dt
  }

  // ============================================
  // RENDERING
  // ============================================

  private drawParticle(p: Particle): void {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    const alpha = (p.life / p.maxLife) * Math.min(speed * 0.5, 1)

    // Dynamic color based on velocity
    const hueShift = speed * 10
    const color = `hsla(${(this.hue + hueShift) % 360}, 80%, 60%, ${alpha})`

    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
    this.ctx.fill()
  }

  private drawTrails(): void {
    // Fade existing canvas for trail effect
    this.ctx.fillStyle = `rgba(14, 14, 14, ${1 - this.config.trailLength})`
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  // ============================================
  // MAIN LOOP
  // ============================================

  private update(dt: number): void {
    this.time += dt
    this.hue += this.config.colorSpeed * dt

    // Spawn new particles
    for (let i = 0; i < this.config.spawnRate; i++) {
      if (this.particles.length < this.config.particleCount) {
        this.particles.push(this.createParticle())
      }
    }

    // Update and filter particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      this.integrateRK4(p, dt)
      p.life -= this.config.fadeRate * dt

      // Wrap around edges
      if (p.x < 0) p.x += this.width
      if (p.x > this.width) p.x -= this.width
      if (p.y < 0) p.y += this.height
      if (p.y > this.height) p.y -= this.height

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  private render(): void {
    this.drawTrails()

    for (const p of this.particles) {
      this.drawParticle(p)
    }
  }

  public start(): void {
    if (this.animationId !== null) return
    let lastTime = performance.now()

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 16.67, 3) // Cap dt
      lastTime = currentTime

      this.update(dt)
      this.render()

      this.animationId = requestAnimationFrame(loop)
    }

    this.animationId = requestAnimationFrame(loop)
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  public destroy(): void {
    this.stop()
    window.removeEventListener('resize', this.onResize)
  }

  // Interactive: change field type
  public setField(type: FieldType): void {
    switch (type) {
      // case 'taylor':
      //   this.getField = this.taylorGreenField.bind(this)
      //   break
      // case 'flow':
      //   this.getField = this.flowField.bind(this)
      //   break
      case 'vortex':
        this.getField = this.vortexField.bind(this)
        break
    }
  }
}
