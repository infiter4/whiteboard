import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  FileText,
  Download,
  Trash2,
  ChevronDown,
  Palette,
  Settings,
  Home
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#A855F7'
];

const SHAPES = [
  { tool: 'rectangle', icon: Square, label: 'Rectangle' },
  { tool: 'circle', icon: Circle, label: 'Circle' },
  { tool: 'triangle', icon: Triangle, label: 'Triangle' },
  { tool: 'star', icon: Star, label: 'Star' },
  { tool: 'pentagon', icon: Pentagon, label: 'Pentagon' },
  { tool: 'hexagon', icon: Hexagon, label: 'Hexagon' },
  { tool: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { tool: 'line', icon: Minus, label: 'Line' },
];

type DrawElement = {
  type: 'line' | 'image' | 'text';
  points?: { x: number; y: number }[];
  color?: string;
  strokeWidth?: number;
  imageData?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
};

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokeMenu, setShowStrokeMenu] = useState(false);
  const [history, setHistory] = useState<DrawElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [whiteboardName, setWhiteboardName] = useState('Untitled Whiteboard');
  const [isEditingName, setIsEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadWhiteboard();
    }
  }, [id, user]);

  useEffect(() => {
    if (!isFullscreen) return;
    const exitOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', exitOnEsc);
    return () => window.removeEventListener('keydown', exitOnEsc);
  }, [isFullscreen]);

  useEffect(() => {
    redrawCanvas();
  }, [elements, currentElement, isFullscreen]);

  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (id && user && elements.length > 0) {
        saveWhiteboard();
      }
    }, 10000);
    return () => clearInterval(saveInterval);
  }, [id, user, elements, whiteboardName]);

  const loadWhiteboard = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('whiteboards')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setWhiteboardName(data.name);
        if (data.canvas_data && data.canvas_data.elements) {
          setElements(data.canvas_data.elements);
        }
      }
    } catch (error) {
      console.error('Error loading whiteboard:', error);
    }
  };

  const saveWhiteboard = async () => {
    if (!id || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('whiteboards')
        .update({
          name: whiteboardName,
          canvas_data: { elements },
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving whiteboard:', error);
    } finally {
      setSaving(false);
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    [...elements, ...(currentElement ? [currentElement] : [])].forEach(element => {
      if (element.type === 'line' && element.points) {
        ctx.save();
        ctx.strokeStyle = element.color || '#000000';
        ctx.lineWidth = element.strokeWidth || 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        element.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      } else if (element.type === 'image' && element.imageData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, element.x || 0, element.y || 0, element.width || 200, element.height || 200);
        };
        img.src = element.imageData;
      }
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pen' || tool === 'eraser') {
      setIsDrawing(true);
      setCurrentElement({
        type: 'line',
        points: [{ x, y }],
        color: tool === 'eraser' ? '#ffffff' : color,
        strokeWidth: tool === 'eraser' ? strokeWidth * 3 : strokeWidth
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElement || (tool !== 'pen' && tool !== 'eraser')) return;

    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentElement(elem =>
      elem && elem.points ? { ...elem, points: [...elem.points, { x, y }] } : null
    );
  };

  const handleMouseUp = () => {
    if (isDrawing && currentElement) {
      const newElements = [...elements, currentElement];
      setElements(newElements);
      setHistory([...history.slice(0, historyStep + 1), newElements]);
      setHistoryStep(historyStep + 1);
      setCurrentElement(null);
      setIsDrawing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 400;
        const maxHeight = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        const newElement: DrawElement = {
          type: 'image',
          imageData,
          x: 100,
          y: 100,
          width,
          height
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        setHistory([...history.slice(0, historyStep + 1), newElements]);
        setHistoryStep(historyStep + 1);
      };
      img.src = imageData;
    };
    reader.readAsDataURL(file);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setElements(history[historyStep - 1] || []);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setElements(history[historyStep + 1] || []);
    }
  };

  const handleClear = () => {
    if (window.confirm('Clear entire canvas? This cannot be undone.')) {
      const newElements: DrawElement[] = [];
      setElements(newElements);
      setHistory([...history.slice(0, historyStep + 1), newElements]);
      setHistoryStep(historyStep + 1);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${whiteboardName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleFullscreen = () => {
    setIsFullscreen(f => !f);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setCustomColor(newColor);
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 bg-slate-50 z-50 flex flex-col' : 'min-h-screen bg-slate-50 flex flex-col'}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <Home className="w-5 h-5 text-slate-600" />
              </button>
              {isEditingName ? (
                <input
                  type="text"
                  value={whiteboardName}
                  onChange={(e) => setWhiteboardName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  className="text-xl font-semibold px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none"
                  autoFocus
                />
              ) : (
                <h1
                  onClick={() => setIsEditingName(true)}
                  className="text-xl font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {whiteboardName}
                </h1>
              )}
              {saving && <span className="text-xs text-slate-500 animate-pulse">Saving...</span>}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium text-slate-700"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium text-red-600"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setTool('select')}
                title="Select"
                className={`p-2.5 rounded-lg transition-all ${tool === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white/50'}`}
              >
                <MousePointer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('pen')}
                title="Pen"
                className={`p-2.5 rounded-lg transition-all ${tool === 'pen' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white/50'}`}
              >
                <Pen className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('eraser')}
                title="Eraser"
                className={`p-2.5 rounded-lg transition-all ${tool === 'eraser' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white/50'}`}
              >
                <Eraser className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('sticky')}
                title="Sticky Note"
                className={`p-2.5 rounded-lg transition-all ${tool === 'sticky' ? 'bg-white shadow-sm text-yellow-600' : 'text-slate-600 hover:bg-white/50'}`}
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {SHAPES.slice(0, 4).map(({ tool: shapeTool, icon: Icon, label }) => (
                <button
                  key={shapeTool}
                  onClick={() => setTool(shapeTool)}
                  title={label}
                  className={`p-2.5 rounded-lg transition-all ${tool === shapeTool ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white/50'}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Add Image"
              className={`p-2.5 rounded-lg transition-all bg-slate-100 hover:bg-slate-200 ${tool === 'image' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <ImageIcon className="w-4 h-4 text-slate-600" />
            </button>

            <div className="h-8 w-px bg-slate-300" />

            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                title="Color Picker"
              >
                <div className="w-6 h-6 rounded-md border-2 border-slate-300 shadow-sm" style={{ backgroundColor: color }} />
                <ChevronDown className="w-4 h-4 text-slate-600" />
              </button>

              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-72"
                  >
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Preset Colors</label>
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map(col => (
                          <button
                            key={col}
                            className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${color === col ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-300'}`}
                            style={{ backgroundColor: col }}
                            onClick={() => {
                              handleColorChange(col);
                              setShowColorPicker(false);
                            }}
                            title={col}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Custom Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-300"
                        />
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                              setCustomColor(val);
                            }
                          }}
                          placeholder="#000000"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                        <button
                          onClick={() => {
                            handleColorChange(customColor);
                            setShowColorPicker(false);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowStrokeMenu(!showStrokeMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                title="Stroke Width"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 rounded-full bg-slate-700" style={{ height: `${strokeWidth}px` }} />
                  <span className="text-sm font-medium text-slate-700">{strokeWidth}px</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-600" />
              </button>

              <AnimatePresence>
                {showStrokeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-64"
                  >
                    <label className="block text-xs font-semibold text-slate-700 mb-3">Stroke Width</label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex items-center justify-between gap-2 mt-3">
                      {[1, 3, 5, 10, 20].map(size => (
                        <button
                          key={size}
                          onClick={() => {
                            setStrokeWidth(size);
                            setShowStrokeMenu(false);
                          }}
                          className={`flex-1 py-2 rounded-lg border-2 transition-all ${strokeWidth === size ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="w-full flex justify-center">
                            <div className="rounded-full bg-slate-700" style={{ width: `${size * 2}px`, height: `${size}px` }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-slate-300" />

            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={handleUndo}
                disabled={historyStep === 0}
                title="Undo"
                className="p-2.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 hover:bg-white/50 hover:text-blue-600"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyStep >= history.length - 1}
                title="Redo"
                className="p-2.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 hover:bg-white/50 hover:text-blue-600"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className={`p-2.5 rounded-lg transition-all ${isFullscreen ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0 m-auto cursor-crosshair shadow-2xl rounded-lg"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </div>
    </div>
  );
}
