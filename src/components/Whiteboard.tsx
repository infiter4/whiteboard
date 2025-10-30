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
  FileText,
  Download,
  Trash2,
  ChevronDown,
  Home,
  Users,
  UserPlus,
  X
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
  type: 'line' | 'image' | 'text' | 'shape' | 'sticky';
  id?: string;
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
  shapeType?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
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
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  }, [elements, currentElement, isFullscreen, selectedElement]);

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

  const drawShape = (ctx: CanvasRenderingContext2D, element: DrawElement) => {
    if (!element.startX || !element.startY || !element.endX || !element.endY) return;

    const width = element.endX - element.startX;
    const height = element.endY - element.startY;

    ctx.save();
    ctx.strokeStyle = element.color || '#000000';
    ctx.fillStyle = element.color || '#000000';
    ctx.lineWidth = element.strokeWidth || 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    switch (element.shapeType) {
      case 'rectangle':
        ctx.strokeRect(element.startX, element.startY, width, height);
        break;
      case 'circle':
        const radiusX = Math.abs(width) / 2;
        const radiusY = Math.abs(height) / 2;
        const centerX = element.startX + width / 2;
        const centerY = element.startY + height / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(element.startX, element.startY);
        ctx.lineTo(element.endX, element.endY);
        ctx.stroke();
        break;
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(element.startX, element.startY);
        ctx.lineTo(element.endX, element.endY);
        ctx.stroke();
        const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
        const arrowLength = 20;
        ctx.beginPath();
        ctx.moveTo(element.endX, element.endY);
        ctx.lineTo(
          element.endX - arrowLength * Math.cos(angle - Math.PI / 6),
          element.endY - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(element.endX, element.endY);
        ctx.lineTo(
          element.endX - arrowLength * Math.cos(angle + Math.PI / 6),
          element.endY - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(element.startX + width / 2, element.startY);
        ctx.lineTo(element.startX, element.endY);
        ctx.lineTo(element.endX, element.endY);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'star':
        drawStar(ctx, element.startX + width / 2, element.startY + height / 2, 5, Math.abs(width) / 2, Math.abs(width) / 4);
        break;
      case 'pentagon':
        drawPolygon(ctx, element.startX + width / 2, element.startY + height / 2, 5, Math.abs(width) / 2);
        break;
      case 'hexagon':
        drawPolygon(ctx, element.startX + width / 2, element.startY + height / 2, 6, Math.abs(width) / 2);
        break;
    }
    ctx.restore();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.stroke();
  };

  const drawPolygon = (ctx: CanvasRenderingContext2D, cx: number, cy: number, sides: number, radius: number) => {
    const angle = (2 * Math.PI) / sides;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const x = cx + radius * Math.cos(i * angle - Math.PI / 2);
      const y = cy + radius * Math.sin(i * angle - Math.PI / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
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

          if (selectedElement === element.id) {
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(element.x || 0, element.y || 0, element.width || 200, element.height || 200);
            ctx.setLineDash([]);

            const handleSize = 8;
            ctx.fillStyle = '#3B82F6';
            ctx.fillRect((element.x || 0) + (element.width || 200) - handleSize / 2, (element.y || 0) + (element.height || 200) - handleSize / 2, handleSize, handleSize);
          }
        };
        img.src = element.imageData;
      } else if (element.type === 'shape') {
        drawShape(ctx, element);
      } else if (element.type === 'text' && element.text) {
        ctx.save();
        ctx.font = `${element.fontSize || 24}px sans-serif`;
        ctx.fillStyle = element.color || '#000000';
        ctx.fillText(element.text, element.x || 0, element.y || 0);
        ctx.restore();
      } else if (element.type === 'sticky') {
        const w = element.width || 200;
        const h = element.height || 200;
        const x = element.x || 0;
        const y = element.y || 0;

        ctx.save();
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#EAB308';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        if (element.text) {
          ctx.fillStyle = '#000000';
          ctx.font = '16px sans-serif';
          const lines = element.text.split('\n');
          lines.forEach((line, i) => {
            ctx.fillText(line, x + 10, y + 25 + i * 20, w - 20);
          });
        }

        if (selectedElement === element.id) {
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    });
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const isPointInImage = (x: number, y: number, element: DrawElement) => {
    if (!element.x || !element.y || !element.width || !element.height) return false;
    return x >= element.x && x <= element.x + element.width &&
           y >= element.y && y <= element.y + element.height;
  };

  const isPointInResizeHandle = (x: number, y: number, element: DrawElement) => {
    if (!element.x || !element.y || !element.width || !element.height) return false;
    const handleSize = 16;
    const handleX = element.x + element.width;
    const handleY = element.y + element.height;
    return x >= handleX - handleSize && x <= handleX + handleSize &&
           y >= handleY - handleSize && y <= handleY + handleSize;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (tool === 'select') {
      const clickedImage = elements.filter(el => (el.type === 'image' || el.type === 'sticky')).reverse().find(el => {
        if (isPointInResizeHandle(x, y, el)) {
          setResizeHandle(el.id || '');
          setSelectedElement(el.id || '');
          return true;
        }
        return isPointInImage(x, y, el);
      });

      if (clickedImage) {
        setSelectedElement(clickedImage.id || '');
        if (!resizeHandle) {
          setDragOffset({
            x: x - (clickedImage.x || 0),
            y: y - (clickedImage.y || 0)
          });
        }
        setIsDrawing(true);
      } else {
        setSelectedElement(null);
      }
      return;
    }

    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newElement: DrawElement = {
          type: 'text',
          id: Date.now().toString(),
          text,
          x,
          y,
          color,
          fontSize: 24
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        setHistory([...history.slice(0, historyStep + 1), newElements]);
        setHistoryStep(historyStep + 1);
      }
      return;
    }

    if (tool === 'sticky') {
      const text = prompt('Enter sticky note text:');
      const newElement: DrawElement = {
        type: 'sticky',
        id: Date.now().toString(),
        text: text || '',
        x,
        y,
        width: 200,
        height: 200
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      setHistory([...history.slice(0, historyStep + 1), newElements]);
      setHistoryStep(historyStep + 1);
      return;
    }

    if (tool === 'pen' || tool === 'eraser') {
      setIsDrawing(true);
      setCurrentElement({
        type: 'line',
        points: [{ x, y }],
        color: tool === 'eraser' ? '#ffffff' : color,
        strokeWidth: tool === 'eraser' ? strokeWidth * 3 : strokeWidth
      });
    } else if (SHAPES.some(s => s.tool === tool)) {
      setIsDrawing(true);
      setCurrentElement({
        type: 'shape',
        shapeType: tool,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        color,
        strokeWidth
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (tool === 'select' && isDrawing && selectedElement) {
      const element = elements.find(el => el.id === selectedElement);
      if (element && (element.type === 'image' || element.type === 'sticky')) {
        if (resizeHandle) {
          const newElements = elements.map(el => {
            if (el.id === selectedElement) {
              return {
                ...el,
                width: Math.max(50, x - (el.x || 0)),
                height: Math.max(50, y - (el.y || 0))
              };
            }
            return el;
          });
          setElements(newElements);
        } else {
          const newElements = elements.map(el => {
            if (el.id === selectedElement) {
              return {
                ...el,
                x: x - dragOffset.x,
                y: y - dragOffset.y
              };
            }
            return el;
          });
          setElements(newElements);
        }
      }
      return;
    }

    if (!isDrawing || !currentElement) return;

    if (tool === 'pen' || tool === 'eraser') {
      setCurrentElement(elem =>
        elem && elem.points ? { ...elem, points: [...elem.points, { x, y }] } : null
      );
    } else if (SHAPES.some(s => s.tool === tool)) {
      setCurrentElement(elem =>
        elem ? { ...elem, endX: x, endY: y } : null
      );
    }
  };

  const handleMouseUp = () => {
    if (tool === 'select' && selectedElement && isDrawing) {
      setIsDrawing(false);
      setResizeHandle(null);
      const newElements = [...elements];
      setHistory([...history.slice(0, historyStep + 1), newElements]);
      setHistoryStep(historyStep + 1);
      return;
    }

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
          id: Date.now().toString(),
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

  const loadCollaborators = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('whiteboard_collaborators')
        .select('user_id, profiles(username, full_name, avatar_url)')
        .eq('whiteboard_id', id);
      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  };

  const addCollaborator = async () => {
    if (!id || !collaboratorEmail.trim()) return;
    try {
      const searchTerm = collaboratorEmail.trim();
      
      // Try to find user by username or email
      // First try username
      let { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', searchTerm)
        .single();
      
      // If not found by username, try to find by matching the username with email prefix
      if (userError || !userData) {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, username')
          .ilike('username', `%${searchTerm}%`);
        
        if (allProfiles && allProfiles.length === 1) {
          userData = allProfiles[0];
        } else if (allProfiles && allProfiles.length > 1) {
          alert('Multiple users found. Please be more specific.');
          return;
        } else {
          alert('User not found. Try searching by their username.');
          return;
        }
      }

      const { error } = await supabase
        .from('whiteboard_collaborators')
        .insert({ whiteboard_id: id, user_id: userData.id });
      
      if (error) throw error;
      setCollaboratorEmail('');
      loadCollaborators();
      alert('Collaborator added successfully!');
    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      alert(error.message || 'Failed to add collaborator');
    }
  };

  const removeCollaborator = async (userId: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('whiteboard_collaborators')
        .delete()
        .eq('whiteboard_id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      loadCollaborators();
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  const deleteWhiteboard = async () => {
    if (!id || !user) return;
    try {
      const { error } = await supabase
        .from('whiteboards')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting whiteboard:', error);
      alert('Failed to delete whiteboard');
    }
  };

  useEffect(() => {
    if (id) loadCollaborators();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`whiteboard:${id}`);

    channel
      .on('broadcast', { event: 'draw' }, (payload) => {
        setElements((prevElements) => [...prevElements, payload.payload]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <div className={isFullscreen ? 'fixed inset-0 bg-background text-foreground z-50 flex flex-col' : 'min-h-screen bg-background text-foreground flex flex-col'}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-lg"
      >
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard')}
                className="p-2.5 hover:bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl transition-all duration-300 group"
                title="Back to Dashboard"
              >
                <Home className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              </motion.button>
              {isEditingName ? (
                <input
                  type="text"
                  value={whiteboardName}
                  onChange={(e) => setWhiteboardName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  className="text-xl font-semibold px-2 py-1 border-2 border-primary rounded-xl focus:outline-none bg-background text-foreground"
                  autoFocus
                />
              ) : (
                <motion.h1
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setIsEditingName(true)}
                  className="text-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent cursor-pointer transition-all duration-300"
                >
                  {whiteboardName}
                </motion.h1>
              )}
              {saving && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20"
                >
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-primary">Saving...</span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCollabModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 rounded-xl transition-all duration-300 text-sm font-semibold text-primary border border-primary/20"
                title="Manage Collaborators"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Collaborate</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-xl transition-all duration-300 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20"
                title="Download"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl transition-all duration-300 text-sm font-semibold text-white shadow-lg shadow-orange-500/20"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-300 text-sm font-semibold text-white shadow-lg shadow-red-500/20"
                title="Delete Whiteboard"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </motion.button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1 bg-accent/50 backdrop-blur-sm rounded-2xl p-1.5 shadow-md border border-border/30"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('select')}
                title="Select"
                className={`p-2.5 rounded-xl transition-all duration-300 ${tool === 'select' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'text-foreground/60 hover:bg-background/70 hover:scale-105'}`}
              >
                <MousePointer className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('pen')}
                title="Pen"
                className={`p-2.5 rounded-xl transition-all duration-300 ${tool === 'pen' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'text-foreground/60 hover:bg-background/70 hover:scale-105'}`}
              >
                <Pen className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('eraser')}
                title="Eraser"
                className={`p-2.5 rounded-xl transition-all duration-300 ${tool === 'eraser' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'text-foreground/60 hover:bg-background/70 hover:scale-105'}`}
              >
                <Eraser className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('text')}
                title="Text"
                className={`p-2.5 rounded-xl transition-all duration-300 ${tool === 'text' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'text-foreground/60 hover:bg-background/70 hover:scale-105'}`}
              >
                <Type className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('sticky')}
                title="Sticky Note"
                className={`p-2.5 rounded-xl transition-all duration-300 ${tool === 'sticky' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30 scale-105' : 'text-foreground/60 hover:bg-background/70 hover:scale-105'}`}
              >
                <FileText className="w-4 h-4" />
              </motion.button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-1 bg-accent/50 backdrop-blur-sm rounded-2xl p-1.5 shadow-md border border-border/30"
            >
              {SHAPES.slice(0, 4).map(({ tool: shapeTool, icon: Icon, label }) => (
                <motion.button
                  key={shapeTool}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTool(shapeTool)}
                  title={label}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${tool === shapeTool ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'text-foreground/60 hover:bg-background/70 hover:scale-105'}`}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1 bg-accent/50 backdrop-blur-sm rounded-2xl p-1.5 shadow-md border border-border/30"
            >
              {SHAPES.slice(4).map(({ tool: shapeTool, icon: Icon, label }) => (
                <motion.button
                  key={shapeTool}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTool(shapeTool)}
                  title={label}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${tool === shapeTool ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'text-foreground/60 hover:bg-background/70 hover:scale-105'}`}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              title="Add Image"
              className={`p-2.5 rounded-xl transition-all duration-300 bg-accent/50 hover:bg-accent/70 ${tool === 'image' ? 'ring-2 ring-primary shadow-lg shadow-primary/30' : ''}`}
            >
              <ImageIcon className="w-4 h-4 text-foreground/70" />
            </motion.button>

            <div className="h-8 w-px bg-border/50" />

            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent/50 hover:bg-accent/70 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
                title="Color Picker"
              >
                <div className="w-6 h-6 rounded-lg border-2 border-border shadow-sm" style={{ backgroundColor: color }} />
                <ChevronDown className="w-4 h-4 text-foreground/60" />
              </motion.button>

              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-5 z-50 w-72"
                  >
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-foreground/80 mb-2">Preset Colors</label>
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map(col => (
                          <button
                            key={col}
                            className={`w-10 h-10 rounded-xl border-2 transition-all duration-300 hover:scale-125 hover:rotate-6 ${color === col ? 'border-primary ring-4 ring-primary/50 scale-110' : 'border-border/50 hover:border-primary/50'}`}
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

                    <div className="border-t border-border pt-3">
                      <label className="block text-xs font-semibold text-foreground/80 mb-2">Custom Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="w-12 h-12 rounded-xl cursor-pointer border-2 border-border"
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
                          className="flex-1 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-background text-foreground"
                        />
                        <button
                          onClick={() => {
                            handleColorChange(customColor);
                            setShowColorPicker(false);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-primary/30 hover:scale-105"
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowStrokeMenu(!showStrokeMenu)}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent/50 hover:bg-accent/70 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
                title="Stroke Width"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 rounded-full bg-foreground/80" style={{ height: `${strokeWidth}px` }} />
                  <span className="text-sm font-medium text-foreground/80">{strokeWidth}px</span>
                </div>
                <ChevronDown className="w-4 h-4 text-foreground/60" />
              </motion.button>

              <AnimatePresence>
                {showStrokeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-5 z-50 w-64"
                  >
                    <label className="block text-xs font-semibold text-foreground/80 mb-3">Stroke Width</label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex items-center justify-between gap-2 mt-3">
                      {[1, 3, 5, 10, 20].map(size => (
                        <button
                          key={size}
                          onClick={() => {
                            setStrokeWidth(size);
                            setShowStrokeMenu(false);
                          }}
                          className={`flex-1 py-2 rounded-xl border-2 transition-all duration-300 ${strokeWidth === size ? 'border-primary bg-primary/10 scale-105 shadow-lg shadow-primary/20' : 'border-border/50 hover:border-primary/50 hover:scale-105'}`}
                        >
                          <div className="w-full flex justify-center">
                            <div className="rounded-full bg-foreground/80" style={{ width: `${size * 2}px`, height: `${size}px` }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-border/50" />

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-1 bg-accent/50 backdrop-blur-sm rounded-2xl p-1.5 shadow-md border border-border/30"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUndo}
                disabled={historyStep === 0}
                title="Undo"
                className="p-2.5 rounded-xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-foreground/60 hover:bg-background/70 hover:text-primary hover:scale-105"
              >
                <Undo className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRedo}
                disabled={historyStep >= history.length - 1}
                title="Redo"
                className="p-2.5 rounded-xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-foreground/60 hover:bg-background/70 hover:text-primary hover:scale-105"
              >
                <Redo className="w-4 h-4" />
              </motion.button>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className={`p-2.5 rounded-xl transition-all duration-300 ${isFullscreen ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-accent/50 hover:bg-accent/70 text-foreground/70'}`}
            >
              <Maximize2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div 
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 relative overflow-hidden bg-gradient-to-br from-background via-background to-background/95"
      >
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0 m-auto cursor-crosshair"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </motion.div>

      {/* Collaboration Modal */}
      <AnimatePresence>
        {showCollabModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCollabModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Manage Collaborators</h2>
                <button
                  onClick={() => setShowCollabModal(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Add Collaborator by Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={collaboratorEmail}
                      onChange={(e) => setCollaboratorEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="flex-1 px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-foreground"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addCollaborator}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add
                    </motion.button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground/80 mb-2">Current Collaborators</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {collaborators.length === 0 ? (
                      <p className="text-sm text-foreground/50 text-center py-4">No collaborators yet</p>
                    ) : (
                      collaborators.map((collab: any) => (
                        <div
                          key={collab.user_id}
                          className="flex items-center justify-between p-3 bg-accent/50 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            {collab.profiles?.avatar_url && (
                              <img 
                                src={collab.profiles.avatar_url} 
                                alt="Avatar" 
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              <p className="font-medium text-foreground">
                                {collab.profiles?.full_name || collab.profiles?.username || 'Unknown User'}
                              </p>
                              <p className="text-sm text-foreground/60">@{collab.profiles?.username || 'no-username'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeCollaborator(collab.user_id)}
                            className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Delete Whiteboard?</h2>
              <p className="text-foreground/70 mb-6">
                Are you sure you want to delete "{whiteboardName}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={deleteWhiteboard}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-500/20"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
