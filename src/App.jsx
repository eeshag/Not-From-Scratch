import './App.css'
import { useEffect, useRef, useState } from 'react'

function App() {
  const [showInstructions, setShowInstructions] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [penWidth, setPenWidth] = useState(8)
  const [selectedColor, setSelectedColor] = useState('#18181b')
  const [activeTool, setActiveTool] = useState('pen')
  const [eraserMode, setEraserMode] = useState('width')
  const [eraserWidth, setEraserWidth] = useState(20)
  const [keyboardPenDown, setKeyboardPenDown] = useState(false)
  const drawingBoardRef = useRef(null)
  const canvasRef = useRef(null)
  const isPointerDownRef = useRef(false)
  const keyboardPenDownRef = useRef(false)
  const penWidthRef = useRef(penWidth)
  const eraserWidthRef = useRef(eraserWidth)
  const selectedColorRef = useRef(selectedColor)
  const lastPointRef = useRef(null)
  const strokesRef = useRef([])
  const activeStrokeRef = useRef(null)
  const colorOptions = [
    '#18181b',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#84cc16',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#a855f7',
    '#ec4899',
    '#f43f5e',
    '#a8a29e',
    '#ffffff',
  ]

  useEffect(() => {
    penWidthRef.current = penWidth
  }, [penWidth])

  useEffect(() => {
    eraserWidthRef.current = eraserWidth
  }, [eraserWidth])

  useEffect(() => {
    selectedColorRef.current = selectedColor
  }, [selectedColor])

  useEffect(() => {
    keyboardPenDownRef.current = keyboardPenDown
  }, [keyboardPenDown])

  useEffect(() => {
    const canvas = canvasRef.current
    const drawingBoard = drawingBoardRef.current

    if (!canvas || !drawingBoard) {
      return undefined
    }

    const redrawCanvas = () => {
      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      const { clientWidth, clientHeight } = drawingBoard
      context.clearRect(0, 0, clientWidth, clientHeight)

      strokesRef.current.forEach((stroke) => {
        if (!stroke.points.length) {
          return
        }

        context.strokeStyle = stroke.color
        context.fillStyle = stroke.color
        context.lineWidth = stroke.width
        context.beginPath()
        context.arc(stroke.points[0].x, stroke.points[0].y, Math.max(stroke.width / 2, 1), 0, Math.PI * 2)
        context.fill()

        for (let index = 1; index < stroke.points.length; index += 1) {
          context.beginPath()
          context.moveTo(stroke.points[index - 1].x, stroke.points[index - 1].y)
          context.lineTo(stroke.points[index].x, stroke.points[index].y)
          context.stroke()
        }
      })
    }

    const resizeCanvas = () => {
      const { clientWidth, clientHeight } = drawingBoard

      if (!clientWidth || !clientHeight) {
        return
      }

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(clientWidth * dpr)
      canvas.height = Math.floor(clientHeight * dpr)
      canvas.style.width = `${clientWidth}px`
      canvas.style.height = `${clientHeight}px`

      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.scale(dpr, dpr)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      redrawCanvas()
    }

    resizeCanvas()
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(drawingBoard)
    window.addEventListener('resize', resizeCanvas)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setKeyboardPenDown(true)
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setKeyboardPenDown(false)
        lastPointRef.current = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getPoint = (event) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const drawSegment = (from, to, width, color) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context || !from || !to) {
      return
    }

    context.strokeStyle = color
    context.lineWidth = width
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
  }

  const drawDot = (point, width, color) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context || !point) {
      return
    }

    context.fillStyle = color
    context.beginPath()
    context.arc(point.x, point.y, Math.max(width / 2, 1), 0, Math.PI * 2)
    context.fill()
  }

  const pointToSegmentDistance = (point, from, to) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    if (dx === 0 && dy === 0) {
      return Math.hypot(point.x - from.x, point.y - from.y)
    }

    const t = Math.max(
      0,
      Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy)),
    )
    const nearestX = from.x + t * dx
    const nearestY = from.y + t * dy
    return Math.hypot(point.x - nearestX, point.y - nearestY)
  }

  const removeStrokeAtPoint = (point) => {
    for (let index = strokesRef.current.length - 1; index >= 0; index -= 1) {
      const stroke = strokesRef.current[index]
      const threshold = Math.max(8, stroke.width / 2 + 4)
      const points = stroke.points

      if (!points.length) {
        continue
      }

      if (points.length === 1) {
        if (Math.hypot(point.x - points[0].x, point.y - points[0].y) <= threshold) {
          strokesRef.current.splice(index, 1)
          const canvas = canvasRef.current
          const drawingBoard = drawingBoardRef.current
          const context = canvas?.getContext('2d')
          if (canvas && drawingBoard && context) {
            context.clearRect(0, 0, drawingBoard.clientWidth, drawingBoard.clientHeight)
            strokesRef.current.forEach((savedStroke) => {
              if (!savedStroke.points.length) {
                return
              }

              context.strokeStyle = savedStroke.color
              context.fillStyle = savedStroke.color
              context.lineWidth = savedStroke.width
              context.beginPath()
              context.arc(savedStroke.points[0].x, savedStroke.points[0].y, Math.max(savedStroke.width / 2, 1), 0, Math.PI * 2)
              context.fill()

              for (let pointIndex = 1; pointIndex < savedStroke.points.length; pointIndex += 1) {
                context.beginPath()
                context.moveTo(savedStroke.points[pointIndex - 1].x, savedStroke.points[pointIndex - 1].y)
                context.lineTo(savedStroke.points[pointIndex].x, savedStroke.points[pointIndex].y)
                context.stroke()
              }
            })
          }
          return
        }
        continue
      }

      for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
        const distance = pointToSegmentDistance(point, points[pointIndex - 1], points[pointIndex])
        if (distance <= threshold) {
          strokesRef.current.splice(index, 1)
          const canvas = canvasRef.current
          const drawingBoard = drawingBoardRef.current
          const context = canvas?.getContext('2d')
          if (canvas && drawingBoard && context) {
            context.clearRect(0, 0, drawingBoard.clientWidth, drawingBoard.clientHeight)
            strokesRef.current.forEach((savedStroke) => {
              if (!savedStroke.points.length) {
                return
              }

              context.strokeStyle = savedStroke.color
              context.fillStyle = savedStroke.color
              context.lineWidth = savedStroke.width
              context.beginPath()
              context.arc(savedStroke.points[0].x, savedStroke.points[0].y, Math.max(savedStroke.width / 2, 1), 0, Math.PI * 2)
              context.fill()

              for (let redrawPointIndex = 1; redrawPointIndex < savedStroke.points.length; redrawPointIndex += 1) {
                context.beginPath()
                context.moveTo(savedStroke.points[redrawPointIndex - 1].x, savedStroke.points[redrawPointIndex - 1].y)
                context.lineTo(savedStroke.points[redrawPointIndex].x, savedStroke.points[redrawPointIndex].y)
                context.stroke()
              }
            })
          }
          return
        }
      }
    }
  }

  const handlePointerDown = (event) => {
    if (event.button !== 0) {
      return
    }

    const point = getPoint(event)
    if (!point) {
      return
    }

    isPointerDownRef.current = true
    lastPointRef.current = point

    if (activeTool === 'eraser' && eraserMode === 'object') {
      removeStrokeAtPoint(point)
      return
    }

    const stroke = {
      color: activeTool === 'eraser' ? '#ffffff' : selectedColorRef.current,
      width: activeTool === 'eraser' ? eraserWidthRef.current : penWidthRef.current,
      points: [point],
    }

    activeStrokeRef.current = stroke
    strokesRef.current.push(stroke)
    drawDot(point, stroke.width, stroke.color)
  }

  const handlePointerMove = (event) => {
    const point = getPoint(event)
    if (!point) {
      return
    }

    const shouldDraw = isPointerDownRef.current || keyboardPenDownRef.current
    if (!shouldDraw) {
      lastPointRef.current = point
      return
    }

    if (activeTool === 'eraser' && eraserMode === 'object') {
      removeStrokeAtPoint(point)
      lastPointRef.current = point
      return
    }

    if (!lastPointRef.current) {
      lastPointRef.current = point
      const stroke = {
        color: activeTool === 'eraser' ? '#ffffff' : selectedColorRef.current,
        width: activeTool === 'eraser' ? eraserWidthRef.current : penWidthRef.current,
        points: [point],
      }
      activeStrokeRef.current = stroke
      strokesRef.current.push(stroke)
      drawDot(point, stroke.width, stroke.color)
      return
    }

    const stroke = activeStrokeRef.current
    if (stroke) {
      stroke.points.push(point)
    }

    const strokeColor = activeTool === 'eraser' ? '#ffffff' : selectedColorRef.current
    const strokeWidth = activeTool === 'eraser' ? eraserWidthRef.current : penWidthRef.current
    drawSegment(lastPointRef.current, point, strokeWidth, strokeColor)
    lastPointRef.current = point
  }

  const handlePointerUp = () => {
    isPointerDownRef.current = false
    activeStrokeRef.current = null
    if (!keyboardPenDownRef.current) {
      lastPointRef.current = null
    }
  }

  return (
    <main className="drawing-game-page">
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setShowSidebar((current) => !current)}
        aria-expanded={showSidebar}
        aria-controls="drawing-tools-sidebar"
      >
        {showSidebar ? 'Hide tools' : 'Show tools'}
      </button>

      <button
        type="button"
        className="info-button"
        onClick={() => setShowInstructions((current) => !current)}
        aria-expanded={showInstructions}
        aria-controls="drawing-game-instructions"
      >
        i
      </button>

      <aside
        id="drawing-tools-sidebar"
        className={`tools-sidebar ${showSidebar ? 'open' : 'closed'}`}
      >
        <h2>Tools</h2>
        <p className="control-label">Active tool</p>
        <div className="tool-options">
          <button
            type="button"
            className={`tool-button ${activeTool === 'pen' ? 'selected' : ''}`}
            onClick={() => setActiveTool('pen')}
          >
            Pen
          </button>
          <button
            type="button"
            className={`tool-button ${activeTool === 'eraser' ? 'selected' : ''}`}
            onClick={() => setActiveTool('eraser')}
          >
            Eraser
          </button>
        </div>

        {activeTool === 'pen' && (
          <>
            <label className="control-label" htmlFor="pen-width">
              Pen width: {penWidth}px
            </label>
            <input
              id="pen-width"
              type="range"
              min="1"
              max="40"
              value={penWidth}
              onChange={(event) => setPenWidth(Number(event.target.value))}
            />

            <p className="control-label">Colors</p>
            <div className="color-options">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Select ${color} color`}
                />
              ))}
            </div>
            <label className="control-label custom-color-label" htmlFor="custom-color">
              Custom color
            </label>
            <input
              id="custom-color"
              className="custom-color-input"
              type="color"
              value={selectedColor}
              onChange={(event) => setSelectedColor(event.target.value)}
              aria-label="Pick a custom color"
            />
          </>
        )}

        {activeTool === 'eraser' && (
          <>
            <p className="control-label eraser-mode-label">Eraser mode</p>
            <div className="tool-options">
              <button
                type="button"
                className={`tool-button ${eraserMode === 'width' ? 'selected' : ''}`}
                onClick={() => setEraserMode('width')}
              >
                Width eraser
              </button>
              <button
                type="button"
                className={`tool-button ${eraserMode === 'object' ? 'selected' : ''}`}
                onClick={() => setEraserMode('object')}
              >
                Remove object
              </button>
            </div>

            {eraserMode === 'width' && (
              <>
                <label className="control-label" htmlFor="eraser-width">
                  Eraser width: {eraserWidth}px
                </label>
                <input
                  id="eraser-width"
                  type="range"
                  min="4"
                  max="70"
                  value={eraserWidth}
                  onChange={(event) => setEraserWidth(Number(event.target.value))}
                />
              </>
            )}
          </>
        )}
        <p className="pen-state">
          Keyboard pen: <strong>{keyboardPenDown ? 'Down' : 'Up'}</strong>
        </p>
      </aside>

      {showInstructions && (
        <section id="drawing-game-instructions" className="instructions-panel">
          <h1>How to Play</h1>
          <p>
            To draw with your mouse, press and hold the mouse button, then release it
            when you want to stop drawing.
          </p>
          <p>
            To draw with your keyboard, use the Down Arrow for pen down and the Up
            Arrow for pen up.
          </p>
          <p>Use the left sidebar to adjust pen width, colors, and other features.</p>
        </section>
      )}

      <section className="drawing-board-wrap" aria-label="Drawing board">
        <div className="drawing-board" ref={drawingBoardRef}>
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>
      </section>
    </main>
  )
}

export default App
