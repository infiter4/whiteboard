import React, { useRef, useState } from 'react';
import {
  Pen,
  Eraser,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Star,
  Triangle,
  Hexagon,
  Pentagon,
  Undo,
  Redo,
  Maximize2,
  MousePointer,
  ZoomIn,
  ZoomOut,
  FileText
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
  const [lines, setLines] = useState<any[]>([]); // {points: [{x, y}], color, strokeWidth}
  const [currentLine, setCurrentLine] = useState<any|null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  React.useEffect(() => {
    if (!isFullscreen) return;
    function exitOnEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsFullscreen(false);
    }
    window.addEventListener('keydown', exitOnEsc);
    return () => window.removeEventListener('keydown', exitOnEsc);
  }, [isFullscreen]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // White bg always
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw lines
    lines.forEach(line => {
      ctx.save();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      line.points.forEach((pt: any, i: number) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    });
    // Draw current unfinished line
    if (currentLine) {
      ctx.save();
      ctx.strokeStyle = currentLine.color;
      ctx.lineWidth = currentLine.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      currentLine.points.forEach((pt: any, i: number) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }
  }, [lines, currentLine, isFullscreen]);

  // CANVAS EVENT HANDLERS
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!(tool === 'pen' || tool === 'eraser')) {
      alert('Tool coming soon!'); // TODO: Implement modes for more tools
      return;
    }
    setIsDrawing(true);
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentLine({
      points: [{ x, y }],
      color: tool === 'eraser' ? '#fff' : color,
      strokeWidth, tool
    });
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !(tool === 'pen' || tool === 'eraser') || !currentLine) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentLine((line: any) => line ? { ...line, points: [...line.points, { x, y }] } : null);
  };
  const handleMouseUp = () => {
    if (isDrawing && currentLine && (tool === 'pen' || tool === 'eraser')) {
      setLines(ls => [...ls, currentLine]);
      setCurrentLine(null);
      setIsDrawing(false);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(f => !f);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 bg-white z-50 flex flex-col' : 'min-h-screen bg-white flex flex-col'}>
      {/* --- Top toolbar --- */}
      <div className="flex w-full py-3 px-6  items-center gap-3 bg-slate-50 border-b border-slate-300 shadow-md sticky top-0 z-40">
        <button onClick={() => setTool('select')} title="Select Pointer" className={`rounded p-2 mx-1 ${tool==='select'?'bg-blue-200':''}`}><MousePointer /></button>
        <button onClick={() => setTool('pen')} title="Pen" className={`rounded p-2 ${tool==='pen'?'bg-blue-200':''}`}><Pen /></button>
        <button onClick={() => setTool('eraser')} title="Eraser" className={`rounded p-2 ${tool==='eraser'?'bg-blue-200':''}`}><Eraser /></button>
        <button onClick={() => setTool('sticky')} title="Sticky Note" className={`rounded p-2 ${tool==='sticky'?'bg-yellow-300/70':''}`}><FileText /></button>
        {/* Shapes group */}
        {SHAPES.map(({ tool: shapeTool, icon, label }) => (
          <button key={shapeTool} onClick={()=>setTool(shapeTool)} title={label} className={`rounded p-2 ${tool===shapeTool?'bg-blue-100':''}`}>{icon}</button>
        ))}
        <button onClick={() => setTool('image')} title="Image" className={`rounded p-2 ${tool==='image'?'bg-green-100':''}`}><ImageIcon /></button>
        {/* Color picker */}
        <button title="Pick Color"
                className="ml-2 w-7 h-7 border rounded-full"
                style={{background: color}} 
                onClick={()=>setShowColorPicker(s=>!s)} />
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
        {/* Fullscreen, undo, redo */}
        <button onClick={handleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} className={`rounded p-2 ${isFullscreen?'bg-slate-500 text-white':'bg-slate-100'}`}><Maximize2 /></button>
        {/* TODO: Add undo/redo support, zoom, text, etc. */}
      </div>
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
      </div>
    </div>
  );
}
