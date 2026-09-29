import React, { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const [hoverState, setHoverState] = useState<'default' | 'interactive' | 'text'>('default')
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  const mousePos = useRef({ x: -100, y: -100 })
  const ringPos = useRef({ x: -100, y: -100 })
  const animFrameId = useRef<number | null>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }

      // Position dot immediately
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      }

      // Check hovered element
      const target = e.target as HTMLElement | null
      if (!target) return

      const isInteractive = target.closest('button, a, input[type="button"], input[type="submit"], [role="button"], [data-cursor="hover"]')
      const isText = target.closest('input[type="text"], input[type="search"], input[type="email"], textarea, [data-cursor="text"]')

      if (isInteractive) {
        setHoverState('interactive')
      } else if (isText) {
        setHoverState('text')
      } else {
        setHoverState('default')
      }
    }

    const render = () => {
      // Lerp ring towards mouse position
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.12
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.12

      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringPos.current.x}px, ${ringPos.current.y}px)`
      }

      animFrameId.current = requestAnimationFrame(render)
    }

    window.addEventListener('mousemove', handleMouseMove)
    animFrameId.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current)
      }
    }
  }, [])

  const dotClasses = `cursor-dot ${
    hoverState === 'interactive'
      ? 'is-hovering-interactive'
      : hoverState === 'text'
      ? 'is-hovering-text'
      : ''
  }`

  const ringClasses = `cursor-ring ${
    hoverState === 'interactive'
      ? 'is-hovering-interactive'
      : hoverState === 'text'
      ? 'is-hovering-text'
      : ''
  }`

  return (
    <>
      <div ref={dotRef} className={dotClasses} aria-hidden="true" />
      <div ref={ringRef} className={ringClasses} aria-hidden="true" />
    </>
  )
}
