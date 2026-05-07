import { useEffect, useRef } from 'react'
import scratchKatUrl from '../assets/scratch-kat.webp'

const STORAGE_KEY = 'nfs-scratch-kat-confetti-done'

function spawnParticles(width) {
  const count = 36
  const particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: -100 - Math.random() * 280,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 1.4 + Math.random() * 2.8,
      r: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.12,
      s: 0.22 + Math.random() * 0.38,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.018 + Math.random() * 0.028,
    })
  }
  return particles
}

export function ScratchKatConfetti() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || sessionStorage.getItem(STORAGE_KEY)) {
      return undefined
    }

    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let cancelled = false
    let rafId = 0
    const startTime = performance.now()
    const maxMs = 9000

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let particles = spawnParticles(window.innerWidth)

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const img = new Image()
    img.decoding = 'async'
    img.src = scratchKatUrl

    const tick = (now) => {
      if (cancelled) return

      const w = window.innerWidth
      const h = window.innerHeight
      const iw = img.naturalWidth
      const ih = img.naturalHeight

      if (now - startTime > maxMs) {
        sessionStorage.setItem(STORAGE_KEY, '1')
        canvas.style.display = 'none'
        return
      }

      ctx.clearRect(0, 0, w, h)

      if (!iw || !ih) {
        rafId = requestAnimationFrame(tick)
        return
      }

      let visible = 0
      for (const p of particles) {
        p.vy += 0.035
        p.y += p.vy
        p.x += p.vx + Math.sin(p.wobble) * 0.9
        p.wobble += p.wobbleSpeed
        p.r += p.vr

        if (p.y < h + 120) visible += 1

        const dw = iw * p.s
        const dh = ih * p.s
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
        ctx.restore()
      }

      if (visible === 0) {
        sessionStorage.setItem(STORAGE_KEY, '1')
        canvas.style.display = 'none'
        return
      }

      rafId = requestAnimationFrame(tick)
    }

    const start = () => {
      particles = spawnParticles(window.innerWidth)
      rafId = requestAnimationFrame(tick)
    }

    if (img.complete) {
      start()
    } else {
      img.onload = () => {
        if (!cancelled) start()
      }
      img.onerror = () => {
        sessionStorage.setItem(STORAGE_KEY, '1')
        canvas.style.display = 'none'
      }
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY)) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="scratch-kat-confetti"
      aria-hidden="true"
    />
  )
}
