/*
Copyright (C) 2023-2026 QuantumNous

HeroGlobe — Clean 3D rotating wireframe mesh sphere
Pure 3D: Fibonacci lattice + proper 3D-aligned mesh lines
No opacity change during rotation, no glow haze, no orbit rings
*/
import { useEffect, useMemo, useState } from 'react'

interface ModelTag {
  name: string
  top: number
  left: number
  color: string
  delay: number
}

const MODEL_TAGS: ModelTag[] = [
  { name: 'OpenAI', top: 6, left: 56, color: '#10a37f', delay: 0 },
  { name: 'Anthropic', top: 10, left: 90, color: '#d97706', delay: 0.8 },
  { name: 'Google', top: 80, left: 60, color: '#4285f4', delay: 1.6 },
  { name: 'DeepSeek', top: 78, left: 84, color: '#2563eb', delay: 2.4 },
  { name: 'Mistral', top: 44, left: 2, color: '#f97316', delay: 0.4 },
  { name: 'ChatGPT', top: 66, left: 14, color: '#10a37f', delay: 1.2 },
  { name: 'Claude', top: 24, left: 18, color: '#d97706', delay: 2.0 },
]

interface HeroGlobeProps {
  className?: string
}

// Fibonacci lattice — evenly distributed points on unit sphere
function useSpherePoints(count: number) {
  return useMemo(() => {
    const pts: { x: number; y: number; z: number }[] = []
    const phi = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = phi * i
      pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r })
    }
    return pts
  }, [count])
}

// Mesh connections — each point connects to its N nearest neighbors (capped, deduped)
function useMeshConnections(points: { x: number; y: number; z: number }[], maxDist: number, maxPerPoint: number) {
  return useMemo(() => {
    const conns: [number, number][] = []
    const used = new Set<string>()
    for (let i = 0; i < points.length; i++) {
      const dists: { j: number; d: number }[] = []
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue
        const dx = points[i].x - points[j].x
        const dy = points[i].y - points[j].y
        const dz = points[i].z - points[j].z
        const d = dx * dx + dy * dy + dz * dz
        if (d < maxDist * maxDist && d > 0.001) {
          dists.push({ j, d })
        }
      }
      dists.sort((a, b) => a.d - b.d)
      let added = 0
      for (const { j } of dists) {
        if (added >= maxPerPoint) break
        const key = i < j ? `${i}-${j}` : `${j}-${i}`
        if (!used.has(key)) {
          used.add(key)
          conns.push([i, j])
          added++
        }
      }
    }
    return conns
  }, [points, maxDist, maxPerPoint])
}

export function HeroGlobe({ className = '' }: HeroGlobeProps) {
  const [mounted, setMounted] = useState(false)
  const SPHERE_SIZE = 432
  const R = SPHERE_SIZE / 2
  const points = useSpherePoints(56)
  const connections = useMeshConnections(points, 0.62, 2)

  useEffect(() => {
    setMounted(true)
  }, [])

  const px = (v: number) => v * R

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: '100%', maxWidth: '560px', aspectRatio: '1/1', margin: '0 auto', perspective: '1400px' }}
    >
      {/* Rotating 3D group — dots + lines only, no glow, no orbit rings */}
      <div
        className='relative'
        style={{
          width: SPHERE_SIZE,
          height: SPHERE_SIZE,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          animation: mounted ? 'globe-spin 30s linear infinite' : 'none',
        }}
      >
        {/* ===== MESH LINES — properly aligned to point pairs ===== */}
        {connections.map(([ai, bi], idx) => {
          const a = points[ai]
          const b = points[bi]
          const mx = (a.x + b.x) * 0.5 * R
          const my = (a.y + b.y) * 0.5 * R
          const mz = (a.z + b.z) * 0.5 * R

          // Direction vector A->B (normalized)
          let dx = b.x - a.x
          let dy = b.y - a.y
          let dz = b.z - a.z
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz) * R
          const nlen = Math.sqrt(dx * dx + dy * dy + dz * dz)
          dx /= nlen
          dy /= nlen
          dz /= nlen

          // Span default direction is local +X (1,0,0). Rotate it to (dx,dy,dz).
          // axis = (1,0,0) x dir = (0, -dz, dy); angle = acos(dx)
          const axisX = 0
          const axisY = -dz
          const axisZ = dy
          const angle = (Math.acos(Math.max(-1, Math.min(1, dx))) * 180) / Math.PI

          return (
            <span
              key={`ln-${idx}`}
              className='absolute'
              style={{
                top: '50%',
                left: '50%',
                height: 1.2,
                width: len,
                marginLeft: -len / 2,
                marginTop: -0.6,
                backgroundColor: 'rgba(96,165,250,0.45)',
                opacity: 1,
                transform: `translate3d(${mx}px, ${my}px, ${mz}px) rotate3d(${axisX}, ${axisY}, ${axisZ}, ${angle}deg)`,
                borderRadius: 0.6,
              }}
            />
          )
        })}

        {/* ===== DOTS — constant opacity, minimal shadow ===== */}
        {points.map((p, i) => {
          const isHub = i % 7 === 0
          const size = isHub ? 6 : 4
          const half = size / 2

          return (
            <span
              key={i}
              className='absolute rounded-full'
              style={{
                top: '50%',
                left: '50%',
                width: size,
                height: size,
                marginLeft: -half,
                marginTop: -half,
                backgroundColor: isHub ? '#2563eb' : '#3b82f6',
                opacity: 1,
                boxShadow: isHub ? '0 0 6px rgba(37,99,235,0.35)' : 'none',
                transform: `translate3d(${px(p.x)}px, ${px(p.y)}px, ${px(p.z)}px)`,
              }}
            />
          )
        })}
      </div>

      {/* Floating model tags — outside rotation */}
      {mounted &&
        MODEL_TAGS.map((tag, i) => (
          <div
            key={`tag-${i}`}
            className='absolute z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-white/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm dark:bg-gray-900/90 dark:border-gray-700/50'
            style={{
              top: `${tag.top}%`,
              left: `${tag.left}%`,
              borderColor: `${tag.color}25`,
              color: tag.color,
              animation: `float-tag 3s ease-in-out ${tag.delay}s infinite`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span
              className='inline-block size-1.5 shrink-0 rounded-full'
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </div>
        ))}

      <style>{`
        @keyframes float-tag {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-6px); }
        }
        @keyframes globe-spin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  )
}
