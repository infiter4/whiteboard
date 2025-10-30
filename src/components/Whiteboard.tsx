import React, { useRef, useState } from 'react';
import {
  Pen, Eraser, Type, Image as ImageIcon, Square, Circle, ArrowRight, Minus, Star, Triangle, Hexagon, Pentagon, Undo, Redo, Maximize2, Select, StickyNote, ZoomIn, ZoomOut
} from 'lucide-react';

const COLORS = [
  '#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#FFEB3B', '#FFFFFF', '#FFA500', '#7C3AED', '#479268'
];

const SHAPES = [
  { tool: 'rectangle', icon: <Square />, label: 'Rectangle' },
  { tool: 'circle', icon: <Circle />, label: 'Circle' },
  { tool: 'triangle', icon: <Triangle />, label: 'Triangle' },
  { tool: 'star', icon: <Star />, label: 'Star' },
  { tool: 'pentagon', icon: <Pentagon />, label: 'Pentagon' },
  { tool: 'hexagon', icon: <Hexagon />, label: 'Hexagon' },
  { tool: 'arrow', icon: <ArrowRight />, label: 'Arrow' },
  { tool: 'line', icon: <Minus />, label: 'Line' },
];

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<any[]>([]);
  const [currentElement, setCurrentElement] = useState<any>(null);
  const [undoStack, setUndoStack] = useState<any[][]>([]);
  const [redoStack, setRedoStack] = useState<any[][]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  // --- Other state for stubs like sticky/image/text can go here ---

  React.useEffect(() => {
    if (!isFullscreen) return;
    function exitOnEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsFullscreen(false);
    }
    window.addEventListener('keydown', exitOnEsc);
    return () => window.removeEventListener('keydown', exitOnEsc);
  }, [isFullscreen]);

  React.useEffect(() => {
    // Redraw logic: placeholder
    // TODO: Implement full redraw/drawing per elements/tools
  }, [elements, currentElement, tool, color, strokeWidth]);

  // CANVAS EVENT HANDLERS
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    // TODO: handle start of drawing or element placement depending on active tool
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    // TODO: handle drawing logic or drag/move for sticky/text/image
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    // TODO: Finish placement and update element arrays for saves/undo.
  };

  // TOOLBAR UTILITY & SHAPE HANDLERS
  const handleUndo = () => {
    // TODO: basic undo logic
  };
  const handleRedo = () => {
    // TODO: basic redo logic
  };

  const handleFullscreen = () => {
    setIsFullscreen(f => !f);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // ---- RENDER
  return (
    <div className={isFullscreen ? 'fixed inset-0 bg-white z-50 flex flex-col' : 'min-h-screen bg-white flex flex-col'}>
      {/* --- Top toolbar --- */}
      <div className="flex w-full py-3 px-6  items-center gap-3 bg-slate-50 border-b border-slate-300 shadow-md sticky top-0 z-40">
        <button onClick={() => setTool('select')} title="Select Pointer" className={`rounded p-2 mx-1 ${tool==='select'?'bg-blue-200':''}`}><Select /></button>
        <div className="flex gap-1">
          <button onClick={() => setTool('pen')} title="Pen" className={`rounded p-2 ${tool==='pen'?'bg-blue-200':''}`}><Pen /></button>
          <button onClick={() => setTool('highlighter')} title="Highlighter" className={`rounded p-2 ${tool==='highlighter'?'bg-yellow-100':''}`}><Type /></button>
          <button onClick={() => setTool('eraser')} title="Eraser" className={`rounded p-2 ${tool==='eraser'?'bg-blue-200':''}`}><Eraser /></button>
        </div>
        <button onClick={() => setTool('sticky')} title="Sticky Note" className={`rounded p-2 ${tool==='sticky'?'bg-yellow-300/70':''}`}><StickyNote /></button>
        <button onClick={() => setTool('text')} title="Text Box" className={`rounded p-2 ${tool==='text'?'bg-blue-100':''}`}><Type /></button>
        <button onClick={() => setTool('image')} title="Image" className={`rounded p-2 ${tool==='image'?'bg-green-100':''}`}><ImageIcon /></button>
        <span className="ml-2 font-semibold text-slate-400">|</span>
        <div className="flex gap-1">
          {SHAPES.map(({ tool: shapeTool, icon, label }) => (
            <button key={shapeTool} onClick={()=>setTool(shapeTool)} title={label} className={`rounded p-2 ${tool===shapeTool?'bg-blue-100':''}`}>{icon}</button>
          ))}
        </div>
        <span className="ml-2 font-semibold text-slate-400">|</span>
        <button onClick={() => setTool('laser')} title="Laser Pointer" className={`rounded p-2 ${tool==='laser'?'bg-pink-200':''}`}>🔦</button>
        {/* Brush/Color/Stroke width */}
        <div className="flex items-center gap-2 ml-4">
          <button title="Pick Color" className="w-7 h-7 border rounded-full" style={{background: color}} onClick={()=>setShowColorPicker(s=>!s)} />
          {showColorPicker && (
            <div className="absolute mt-14 p-2 bg-white rounded-lg shadow-lg flex gap-1 z-50 border">
              {COLORS.map(col => <button
                key={col}
                className="w-7 h-7 rounded-full border"
                style={{background: col}}
                onClick={()=>{setColor(col);setShowColorPicker(false);}} />
              )}
            </div>
          )}
          <input
            title="Line width"
            className="ml-2"
            type="range" min={1} max={15} value={strokeWidth} onChange={e=>setStrokeWidth(Number(e.target.value))}
          />
          <span className="text-xs text-slate-600">{strokeWidth}px</span>
        </div>
        {/* Undo / Redo / Fullscreen / Zoom */}
        <div className="ml-auto flex gap-2 items-center">
          <button onClick={handleUndo} title="Undo" className="rounded p-2"><Undo /></button>
          <button onClick={handleRedo} title="Redo" className="rounded p-2"><Redo /></button>
          <button onClick={handleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} className={`rounded p-2 ${isFullscreen?'bg-slate-500 text-white':'bg-slate-100'}`}><Maximize2 /></button>
          <span className="ml-2 font-semibold text-slate-400">|</span>
          <button onClick={()=>setStrokeWidth(Math.max(1, strokeWidth - 1))} title="Zoom Out" className="rounded p-2"><ZoomOut /></button>
          <button onClick={()=>setStrokeWidth(Math.min(15, strokeWidth + 1))} title="Zoom In" className="rounded p-2"><ZoomIn /></button>
        </div>
      </div>
      {/* --- Canvas --- */}
      <div className="flex-1 relative overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight - 100}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair bg-white w-full h-full select-none"
        />
        {/* TODO: Render sticky notes, images, text boxes, and show on-canvas selection/placement per mode/tool. */}
      </div>
      {/* TODO: Add modal(s) for sticky creation/edit, image upload, and text placement as needed. */}
    </div>
  );
}
