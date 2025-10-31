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
  X,
  MessageSquare
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
  layer?: number;
};

export type Comment = {
  id: number;
  whiteboard_id: string;
  element_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
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
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentLayer, setCurrentLayer] = useState(0);
  const [layers, setLayers] = useState<string[]>(['Layer 1']);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

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
  }, [elements, currentElement, isFullscreen, selectedElement, currentLayer]);

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
        if (element.strokeWidth === 0) {
          ctx.fillRect(element.startX, element.startY, width, height);
        } else {
          ctx.strokeRect(element.startX, element.startY, width, height);
        }
        break;
      case 'circle':
        const radiusX = Math.abs(width) / 2;
        const radiusY = Math.abs(height) / 2;
        const centerX = element.startX + width / 2;
        const centerY = element.startY + height / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        if (element.strokeWidth === 0) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
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

    const visibleElements = elements.filter(el => (el.layer || 0) === currentLayer);
    [...visibleElements, ...(currentElement ? [currentElement] : [])].forEach(element => {
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
      const clickedImage = elements.filter(el => (el.type === 'image' || el.type === 'sticky') && (el.layer || 0) === currentLayer).reverse().find(el => {
        if (isPointInResizeHandle(x, y, el)) {
          setResizeHandle(el.id || '');
          setSelectedElement(el.id || '');
          return true;
        }
        return isPointInImage(x, y, el);
      });

      if (clickedImage) {
        setSelectedElement(clickedImage.id || '');
        loadComments(clickedImage.id || '');
        setShowCommentsPanel(true);
        if (!resizeHandle) {
          setDragOffset({
            x: x - (clickedImage.x || 0),
            y: y - (clickedImage.y || 0)
          });
        }
        setIsDrawing(true);
      } else {
        setSelectedElement(null);
        setShowCommentsPanel(false);
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
          fontSize: 24,
          layer: currentLayer
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
        height: 200,
        layer: currentLayer
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
        strokeWidth: tool === 'eraser' ? strokeWidth * 3 : strokeWidth,
        layer: currentLayer
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
        strokeWidth,
        layer: currentLayer
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
          height,
          layer: currentLayer
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

  const loadComments = async (elementId: string) => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('element_comments')
        .select('*, profiles(username, avatar_url)')
        .eq('whiteboard_id', id)
        .eq('element_id', elementId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const addComment = async () => {
    if (!id || !user || !selectedElement || !newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('element_comments')
        .insert({
          whiteboard_id: id,
          element_id: selectedElement,
          user_id: user.id,
          comment_text: newComment.trim(),
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) throw error;
      if (data) {
        setComments([...comments, data as Comment]);
      }
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
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

  const addLayer = () => {
    const newLayerName = `Layer ${layers.length + 1}`;
    setLayers([...layers, newLayerName]);
    setCurrentLayer(layers.length);
  };

  const deleteLayer = (index: number) => {
    if (layers.length === 1) {
      alert('Cannot delete the last layer');
      return;
    }
    const newLayers = layers.filter((_, i) => i !== index);
    setLayers(newLayers);
    if (currentLayer >= newLayers.length) {
      setCurrentLayer(newLayers.length - 1);
    }
    // Remove elements from deleted layer
    setElements(elements.filter(el => (el.layer || 0) !== index));
  };

  const moveLayerUp = (index: number) => {
    if (index === 0) return;
    const newLayers = [...layers];
    [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
    setLayers(newLayers);
    // Update element layers
    const newElements = elements.map(el => {
      if ((el.layer || 0) === index) return { ...el, layer: index - 1 };
      if ((el.layer || 0) === index - 1) return { ...el, layer: index };
      return el;
    });
    setElements(newElements);
  };

  const moveLayerDown = (index: number) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
    setLayers(newLayers);
    // Update element layers
    const newElements = elements.map(el => {
      if ((el.layer || 0) === index) return { ...el, layer: index + 1 };
      if ((el.layer || 0) === index + 1) return { ...el, layer: index };
      return el;
    });
    setElements(newElements);
  };

  const renameLayer = (index: number, newName: string) => {
    const newLayers = [...layers];
    newLayers[index] = newName;
    setLayers(newLayers);
  };

  const getVisibleElements = () => {
    return elements.filter(el => (el.layer || 0) === currentLayer);
  };

  const templates = [
    {
      name: 'Brainstorming Board',
      description: 'Sticky notes for idea generation',
      icon: '💡',
      elements: [
        // Premium gradient header with shadow
        { type: 'shape' as const, id: Date.now().toString() + '0a', shapeType: 'rectangle', startX: 40, startY: 25, endX: 960, endY: 135, color: '#1E3A8A', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '0b', shapeType: 'rectangle', startX: 50, startY: 30, endX: 950, endY: 125, color: '#3B82F6', strokeWidth: 0, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '1', text: '💡 BRAINSTORMING SESSION 2024', x: 140, y: 88, color: '#FFFFFF', fontSize: 44, layer: 0 },
        // Decorative corner elements
        { type: 'shape' as const, id: Date.now().toString() + '1a', shapeType: 'circle', startX: 70, startY: 45, endX: 135, endY: 110, color: '#60A5FA', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '1b', shapeType: 'circle', startX: 865, startY: 45, endX: 930, endY: 110, color: '#60A5FA', strokeWidth: 4, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '1c', text: '⚡', x: 90, y: 88, color: '#FCD34D', fontSize: 32, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '1d', text: '⚡', x: 885, y: 88, color: '#FCD34D', fontSize: 32, layer: 0 },
        
        // IDEAS Section with premium styling
        { type: 'shape' as const, id: Date.now().toString() + '2box', shapeType: 'rectangle', startX: 60, startY: 155, endX: 940, endY: 195, color: '#F3E8FF', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '2line', shapeType: 'line', startX: 60, startY: 195, endX: 940, endY: 195, color: '#8B5CF6', strokeWidth: 4, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '2a', text: '✨ CREATIVE IDEAS & CONCEPTS', x: 320, y: 182, color: '#6B21A8', fontSize: 32, layer: 0 },
        
        // Idea cards with shadows and borders
        { type: 'shape' as const, id: Date.now().toString() + '2s1', shapeType: 'rectangle', startX: 75, startY: 225, endX: 315, endY: 465, color: '#E0E7FF', strokeWidth: 0, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '2', text: '💭 IDEA #1\n━━━━━━━━━━\n\n"Innovative product feature that solves X problem"\n\n🎯 Target: New users\n📊 Impact: High', x: 80, y: 230, width: 230, height: 230, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '3s1', shapeType: 'rectangle', startX: 335, startY: 225, endX: 575, endY: 465, color: '#DBEAFE', strokeWidth: 0, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '3', text: '🚀 IDEA #2\n━━━━━━━━━━\n\n"Marketing campaign to boost engagement"\n\n🎯 Target: All users\n📊 Impact: Medium', x: 340, y: 230, width: 230, height: 230, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '4s1', shapeType: 'rectangle', startX: 595, startY: 225, endX: 835, endY: 465, color: '#FEF3C7', strokeWidth: 0, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '4', text: '⭐ IDEA #3\n━━━━━━━━━━\n\n"Partnership opportunity with industry leader"\n\n🎯 Target: B2B\n📊 Impact: Very High', x: 600, y: 230, width: 230, height: 230, layer: 0 },
        
        // ACTION ITEMS Section
        { type: 'shape' as const, id: Date.now().toString() + '5box', shapeType: 'rectangle', startX: 60, startY: 485, endX: 940, endY: 525, color: '#FEE2E2', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '5line', shapeType: 'line', startX: 60, startY: 525, endX: 940, endY: 525, color: '#EF4444', strokeWidth: 4, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '5a', text: '🎯 ACTION ITEMS & NEXT STEPS', x: 300, y: 512, color: '#991B1B', fontSize: 32, layer: 0 },
        
        // Action cards
        { type: 'shape' as const, id: Date.now().toString() + '5s1', shapeType: 'rectangle', startX: 75, startY: 545, endX: 315, endY: 745, color: '#D1FAE5', strokeWidth: 0, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '5', text: '✅ ACTION #1\n━━━━━━━━━━\n\nResearch competitors\n\n👤 Owner: Team Lead\n📅 Due: This Week\n⚡ Priority: HIGH', x: 80, y: 550, width: 230, height: 190, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '6s1', shapeType: 'rectangle', startX: 335, startY: 545, endX: 575, endY: 745, color: '#D1FAE5', strokeWidth: 0, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '6', text: '✅ ACTION #2\n━━━━━━━━━━\n\nCreate prototype\n\n👤 Owner: Design Team\n📅 Due: Next Week\n⚡ Priority: MEDIUM', x: 340, y: 550, width: 230, height: 190, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '7s1', shapeType: 'rectangle', startX: 595, startY: 545, endX: 835, endY: 745, color: '#D1FAE5', strokeWidth: 0, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '7', text: '✅ ACTION #3\n━━━━━━━━━━\n\nSchedule review meeting\n\n👤 Owner: PM\n📅 Due: Friday\n⚡ Priority: HIGH', x: 600, y: 550, width: 230, height: 190, layer: 0 },
        
        // Premium decorative elements
        { type: 'shape' as const, id: Date.now().toString() + '8', shapeType: 'star', startX: 860, startY: 210, endX: 920, endY: 270, color: '#FBBF24', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '9', shapeType: 'star', startX: 860, startY: 540, endX: 920, endY: 600, color: '#F59E0B', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '10', shapeType: 'circle', startX: 870, startY: 350, endX: 910, endY: 390, color: '#EC4899', strokeWidth: 3, layer: 0 },
      ]
    },
    {
      name: 'Flowchart',
      description: 'Process flow diagram',
      icon: '📊',
      elements: [
        // Premium header with depth
        { type: 'shape' as const, id: Date.now().toString() + '0a', shapeType: 'rectangle', startX: 40, startY: 25, endX: 960, endY: 135, color: '#065F46', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '0b', shapeType: 'rectangle', startX: 50, startY: 30, endX: 950, endY: 125, color: '#10B981', strokeWidth: 0, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '1', text: '📊 ENTERPRISE WORKFLOW', x: 280, y: 88, color: '#FFFFFF', fontSize: 46, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '1a', shapeType: 'hexagon', startX: 75, startY: 45, endX: 140, endY: 110, color: '#34D399', strokeWidth: 5, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '1b', shapeType: 'hexagon', startX: 860, startY: 45, endX: 925, endY: 110, color: '#34D399', strokeWidth: 5, layer: 0 },
        
        // START node with premium styling
        { type: 'shape' as const, id: Date.now().toString() + '2a', shapeType: 'circle', startX: 370, startY: 145, endX: 630, endY: 235, color: '#DBEAFE', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '2b', shapeType: 'rectangle', startX: 410, startY: 160, endX: 590, endY: 220, color: '#1E40AF', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '2', shapeType: 'rectangle', startX: 415, startY: 165, endX: 585, endY: 215, color: '#3B82F6', strokeWidth: 5, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '3', text: '🚀 INITIATE', x: 445, y: 197, color: '#FFFFFF', fontSize: 28, layer: 0 },
        
        // PROCESS node
        { type: 'shape' as const, id: Date.now().toString() + '4a', shapeType: 'rectangle', startX: 370, startY: 275, endX: 630, endY: 375, color: '#F3E8FF', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '4b', shapeType: 'rectangle', startX: 410, startY: 295, endX: 590, endY: 355, color: '#6B21A8', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '4', shapeType: 'rectangle', startX: 415, startY: 300, endX: 585, endY: 350, color: '#8B5CF6', strokeWidth: 5, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '5', text: '⚙️ EXECUTE', x: 445, y: 332, color: '#FFFFFF', fontSize: 28, layer: 0 },
        
        // DECISION diamond
        { type: 'shape' as const, id: Date.now().toString() + '5a', shapeType: 'pentagon', startX: 405, startY: 405, endX: 595, endY: 505, color: '#FEF3C7', strokeWidth: 5, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '5b', text: '❓ VALIDATE', x: 435, y: 462, color: '#92400E', fontSize: 26, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '5c', text: 'YES', x: 520, y: 520, color: '#10B981', fontSize: 20, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '5d', text: 'NO', x: 620, y: 450, color: '#EF4444', fontSize: 20, layer: 0 },
        
        // SUCCESS node
        { type: 'shape' as const, id: Date.now().toString() + '6a', shapeType: 'circle', startX: 370, startY: 545, endX: 630, endY: 645, color: '#D1FAE5', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '6b', shapeType: 'rectangle', startX: 410, startY: 565, endX: 590, endY: 625, color: '#065F46', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '6', shapeType: 'rectangle', startX: 415, startY: 570, endX: 585, endY: 620, color: '#10B981', strokeWidth: 5, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '7', text: '✓ SUCCESS', x: 440, y: 602, color: '#FFFFFF', fontSize: 28, layer: 0 },
        
        // RETRY path
        { type: 'shape' as const, id: Date.now().toString() + '7a', shapeType: 'rectangle', startX: 670, startY: 420, endX: 850, endY: 490, color: '#FEE2E2', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '7b', shapeType: 'rectangle', startX: 680, startY: 430, endX: 840, endY: 480, color: '#EF4444', strokeWidth: 4, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '7c', text: '🔄 RETRY', x: 730, y: 462, color: '#FFFFFF', fontSize: 24, layer: 0 },
        
        // Premium arrows
        { type: 'shape' as const, id: Date.now().toString() + '8', shapeType: 'arrow', startX: 500, startY: 220, endX: 500, endY: 295, color: '#6366F1', strokeWidth: 6, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '9', shapeType: 'arrow', startX: 500, startY: 355, endX: 500, endY: 405, color: '#A855F7', strokeWidth: 6, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '10', shapeType: 'arrow', startX: 500, startY: 505, endX: 500, endY: 565, color: '#10B981', strokeWidth: 6, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '11', shapeType: 'arrow', startX: 595, startY: 455, endX: 680, endY: 455, color: '#EF4444', strokeWidth: 5, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '12', shapeType: 'arrow', startX: 760, startY: 430, endX: 760, endY: 325, color: '#F59E0B', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '13', shapeType: 'arrow', startX: 760, startY: 325, endX: 590, endY: 325, color: '#F59E0B', strokeWidth: 4, layer: 0 },
        
        // Info panels
        { type: 'shape' as const, id: Date.now().toString() + '14a', shapeType: 'rectangle', startX: 60, startY: 160, endX: 340, endY: 220, color: '#F0F9FF', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '14b', shapeType: 'rectangle', startX: 65, startY: 165, endX: 335, endY: 215, color: '#DBEAFE', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '14', text: '📋 Phase 1: Setup\nDuration: 5 min', x: 85, y: 195, color: '#1E40AF', fontSize: 18, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '15a', shapeType: 'rectangle', startX: 60, startY: 295, endX: 340, endY: 355, color: '#FAF5FF', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '15b', shapeType: 'rectangle', startX: 65, startY: 300, endX: 335, endY: 350, color: '#F3E8FF', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '15', text: '📋 Phase 2: Process\nDuration: 15 min', x: 85, y: 330, color: '#6B21A8', fontSize: 18, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '16a', shapeType: 'rectangle', startX: 60, startY: 570, endX: 340, endY: 630, color: '#F0FDF4', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '16b', shapeType: 'rectangle', startX: 65, startY: 575, endX: 335, endY: 625, color: '#D1FAE5', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '16', text: '📋 Phase 3: Complete\nTotal: ~20 min', x: 85, y: 605, color: '#065F46', fontSize: 18, layer: 0 },
      ]
    },
    {
      name: 'Mind Map',
      description: 'Central idea with branches',
      icon: '🧠',
      elements: [
        // Premium Header
        { type: 'shape' as const, id: Date.now().toString() + '0a', shapeType: 'rectangle', startX: 40, startY: 25, endX: 960, endY: 135, color: '#9F1239', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '0', shapeType: 'rectangle', startX: 50, startY: 30, endX: 950, endY: 125, color: '#EC4899', strokeWidth: 0, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '1', text: '🧠 STRATEGIC MIND MAP', x: 280, y: 88, color: '#FFFFFF', fontSize: 46, layer: 0 },
        // Central idea with glow
        { type: 'shape' as const, id: Date.now().toString() + '2a', shapeType: 'circle', startX: 380, startY: 280, endX: 620, endY: 520, color: '#FCE7F3', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '2', shapeType: 'circle', startX: 400, startY: 300, endX: 600, endY: 500, color: '#EC4899', strokeWidth: 6, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '3', text: '💡 MAIN\nIDEA', x: 445, y: 390, color: '#BE185D', fontSize: 32, layer: 0 },
        // Branch 1 - Top Left (Blue)
        { type: 'shape' as const, id: Date.now().toString() + '4a', shapeType: 'circle', startX: 130, startY: 140, endX: 300, endY: 310, color: '#DBEAFE', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '4', shapeType: 'circle', startX: 150, startY: 160, endX: 280, endY: 290, color: '#3B82F6', strokeWidth: 5, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '5', text: '🔵 Branch 1', x: 165, y: 230, color: '#1E40AF', fontSize: 20, layer: 0 },
        // Branch 2 - Top Right (Green)
        { type: 'shape' as const, id: Date.now().toString() + '6a', shapeType: 'circle', startX: 700, startY: 140, endX: 870, endY: 310, color: '#D1FAE5', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '6', shapeType: 'circle', startX: 720, startY: 160, endX: 850, endY: 290, color: '#10B981', strokeWidth: 5, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '7', text: '🟢 Branch 2', x: 735, y: 230, color: '#065F46', fontSize: 20, layer: 0 },
        // Branch 3 - Bottom Left (Orange)
        { type: 'shape' as const, id: Date.now().toString() + '8a', shapeType: 'circle', startX: 130, startY: 490, endX: 300, endY: 660, color: '#FEF3C7', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '8', shapeType: 'circle', startX: 150, startY: 510, endX: 280, endY: 640, color: '#F59E0B', strokeWidth: 5, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '9', text: '🟠 Branch 3', x: 165, y: 580, color: '#92400E', fontSize: 20, layer: 0 },
        // Branch 4 - Bottom Right (Purple)
        { type: 'shape' as const, id: Date.now().toString() + '10a', shapeType: 'circle', startX: 700, startY: 490, endX: 870, endY: 660, color: '#F3E8FF', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '10', shapeType: 'circle', startX: 720, startY: 510, endX: 850, endY: 640, color: '#8B5CF6', strokeWidth: 5, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '11', text: '🟣 Branch 4', x: 735, y: 580, color: '#6B21A8', fontSize: 20, layer: 0 },
        // Connecting lines with gradient effect
        { type: 'shape' as const, id: Date.now().toString() + '12', shapeType: 'line', startX: 400, startY: 330, endX: 280, endY: 240, color: '#3B82F6', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '13', shapeType: 'line', startX: 600, startY: 330, endX: 720, endY: 240, color: '#10B981', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '14', shapeType: 'line', startX: 400, startY: 470, endX: 280, endY: 560, color: '#F59E0B', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '15', shapeType: 'line', startX: 600, startY: 470, endX: 720, endY: 560, color: '#8B5CF6', strokeWidth: 4, layer: 0 },
        // Decorative elements
        { type: 'shape' as const, id: Date.now().toString() + '16', shapeType: 'star', startX: 50, startY: 350, endX: 100, endY: 400, color: '#FBBF24', strokeWidth: 3, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '17', shapeType: 'star', startX: 900, startY: 350, endX: 950, endY: 400, color: '#FBBF24', strokeWidth: 3, layer: 0 },
      ]
    },
    {
      name: 'Kanban Board',
      description: 'Task management columns',
      icon: '📋',
      elements: [
        // Header with gradient
        { type: 'shape' as const, id: Date.now().toString() + '0', shapeType: 'rectangle', startX: 50, startY: 30, endX: 950, endY: 110, color: '#8B5CF6', strokeWidth: 0, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '1', text: '📋 KANBAN BOARD', x: 280, y: 80, color: '#FFFFFF', fontSize: 48, layer: 0 },
        // Decorative elements
        { type: 'shape' as const, id: Date.now().toString() + '1a', shapeType: 'pentagon', startX: 80, startY: 45, endX: 140, endY: 95, color: '#C084FC', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '1b', shapeType: 'pentagon', startX: 860, startY: 45, endX: 920, endY: 95, color: '#C084FC', strokeWidth: 4, layer: 0 },
        
        // TO DO Column (Red)
        { type: 'shape' as const, id: Date.now().toString() + '2a', shapeType: 'rectangle', startX: 80, startY: 140, endX: 330, endY: 200, color: '#FEE2E2', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '2', shapeType: 'rectangle', startX: 100, startY: 150, endX: 310, endY: 190, color: '#EF4444', strokeWidth: 4, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '3', text: '🔴 TO DO', x: 160, y: 177, color: '#991B1B', fontSize: 26, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '8', text: '☐ Task 1\n\nPriority: High\nDue: Today', x: 110, y: 220, width: 190, height: 160, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '9', text: '☐ Task 2\n\nPriority: Medium\nDue: Tomorrow', x: 110, y: 400, width: 190, height: 160, layer: 0 },
        
        // IN PROGRESS Column (Orange)
        { type: 'shape' as const, id: Date.now().toString() + '4a', shapeType: 'rectangle', startX: 360, startY: 140, endX: 640, endY: 200, color: '#FEF3C7', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '4', shapeType: 'rectangle', startX: 380, startY: 150, endX: 620, endY: 190, color: '#F59E0B', strokeWidth: 4, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '5', text: '🟡 IN PROGRESS', x: 415, y: 177, color: '#92400E', fontSize: 26, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '10', text: '⏳ Task 3\n\nStatus: Working\nProgress: 60%', x: 390, y: 220, width: 220, height: 160, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '10a', text: '⏳ Task 4\n\nStatus: Review\nProgress: 80%', x: 390, y: 400, width: 220, height: 160, layer: 0 },
        
        // DONE Column (Green)
        { type: 'shape' as const, id: Date.now().toString() + '6a', shapeType: 'rectangle', startX: 670, startY: 140, endX: 920, endY: 200, color: '#D1FAE5', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '6', shapeType: 'rectangle', startX: 690, startY: 150, endX: 900, endY: 190, color: '#10B981', strokeWidth: 4, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '7', text: '🟢 DONE', x: 750, y: 177, color: '#065F46', fontSize: 26, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '11', text: '✓ Task 5\n\nCompleted!\n🎉 Success', x: 700, y: 220, width: 190, height: 160, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '11a', text: '✓ Task 6\n\nDeployed\n✨ Live', x: 700, y: 400, width: 190, height: 160, layer: 0 },
        
        // Decorative dividers
        { type: 'shape' as const, id: Date.now().toString() + '12', shapeType: 'line', startX: 345, startY: 150, endX: 345, endY: 700, color: '#E5E7EB', strokeWidth: 3, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '13', shapeType: 'line', startX: 655, startY: 150, endX: 655, endY: 700, color: '#E5E7EB', strokeWidth: 3, layer: 0 },
      ]
    },
    {
      name: 'Weekly Planner',
      description: 'Week schedule layout',
      icon: '📅',
      elements: [
        // Header with gradient
        { type: 'shape' as const, id: Date.now().toString() + '0', shapeType: 'rectangle', startX: 50, startY: 30, endX: 950, endY: 110, color: '#F59E0B', strokeWidth: 0, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '1', text: '📅 WEEKLY PLANNER', x: 250, y: 80, color: '#FFFFFF', fontSize: 48, layer: 0 },
        // Decorative calendar icons
        { type: 'shape' as const, id: Date.now().toString() + '1a', shapeType: 'rectangle', startX: 80, startY: 50, endX: 130, endY: 90, color: '#FCD34D', strokeWidth: 4, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '1b', shapeType: 'rectangle', startX: 870, startY: 50, endX: 920, endY: 90, color: '#FCD34D', strokeWidth: 4, layer: 0 },
        
        // Weekdays (Blue theme)
        { type: 'shape' as const, id: Date.now().toString() + '2a', shapeType: 'rectangle', startX: 80, startY: 140, endX: 230, endY: 200, color: '#DBEAFE', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '2', shapeType: 'rectangle', startX: 100, startY: 150, endX: 210, endY: 190, color: '#3B82F6', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '3', text: '🟦 MON', x: 130, y: 177, color: '#1E40AF', fontSize: 20, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '4a', shapeType: 'rectangle', startX: 250, startY: 140, endX: 400, endY: 200, color: '#DBEAFE', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '4', shapeType: 'rectangle', startX: 270, startY: 150, endX: 380, endY: 190, color: '#3B82F6', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '5', text: '🟦 TUE', x: 300, y: 177, color: '#1E40AF', fontSize: 20, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '6a', shapeType: 'rectangle', startX: 420, startY: 140, endX: 570, endY: 200, color: '#DBEAFE', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '6', shapeType: 'rectangle', startX: 440, startY: 150, endX: 550, endY: 190, color: '#3B82F6', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '7', text: '🟦 WED', x: 465, y: 177, color: '#1E40AF', fontSize: 20, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '8a', shapeType: 'rectangle', startX: 590, startY: 140, endX: 740, endY: 200, color: '#DBEAFE', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '8', shapeType: 'rectangle', startX: 610, startY: 150, endX: 720, endY: 190, color: '#3B82F6', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '9', text: '🟦 THU', x: 635, y: 177, color: '#1E40AF', fontSize: 20, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '10a', shapeType: 'rectangle', startX: 760, startY: 140, endX: 910, endY: 200, color: '#D1FAE5', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '10', shapeType: 'rectangle', startX: 780, startY: 150, endX: 890, endY: 190, color: '#10B981', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '11', text: '🟩 FRI', x: 815, y: 177, color: '#065F46', fontSize: 20, layer: 0 },
        
        // Weekend (Pink theme)
        { type: 'shape' as const, id: Date.now().toString() + '12a', shapeType: 'rectangle', startX: 80, startY: 220, endX: 280, endY: 280, color: '#FCE7F3', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '12', shapeType: 'rectangle', startX: 100, startY: 230, endX: 260, endY: 270, color: '#EC4899', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '13', text: '💖 SATURDAY', x: 130, y: 257, color: '#BE185D', fontSize: 20, layer: 0 },
        
        { type: 'shape' as const, id: Date.now().toString() + '14a', shapeType: 'rectangle', startX: 300, startY: 220, endX: 500, endY: 280, color: '#FCE7F3', strokeWidth: 0, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '14', shapeType: 'rectangle', startX: 320, startY: 230, endX: 480, endY: 270, color: '#EC4899', strokeWidth: 3, layer: 0 },
        { type: 'text' as const, id: Date.now().toString() + '15', text: '☀️ SUNDAY', x: 355, y: 257, color: '#BE185D', fontSize: 20, layer: 0 },
        
        // Goals and Notes sections
        { type: 'text' as const, id: Date.now().toString() + '16a', text: '🎯 WEEKLY GOALS', x: 100, y: 320, color: '#8B5CF6', fontSize: 28, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '16', text: '• Goal 1: Complete project\n• Goal 2: Exercise 3x\n• Goal 3: Read book\n• Goal 4: Team meeting', x: 100, y: 360, width: 350, height: 240, layer: 0 },
        
        { type: 'text' as const, id: Date.now().toString() + '17a', text: '📝 NOTES & IDEAS', x: 520, y: 320, color: '#F59E0B', fontSize: 28, layer: 0 },
        { type: 'sticky' as const, id: Date.now().toString() + '17', text: '✨ Important reminders\n💡 New ideas\n📞 Calls to make\n✉️ Emails to send', x: 520, y: 360, width: 350, height: 240, layer: 0 },
        
        // Decorative stars
        { type: 'shape' as const, id: Date.now().toString() + '18', shapeType: 'star', startX: 520, startY: 150, endX: 560, endY: 190, color: '#FBBF24', strokeWidth: 3, layer: 0 },
        { type: 'shape' as const, id: Date.now().toString() + '19', shapeType: 'star', startX: 520, startY: 230, endX: 560, endY: 270, color: '#F472B6', strokeWidth: 3, layer: 0 },
      ]
    }
  ];

  const loadTemplate = (templateIndex: number) => {
    if (window.confirm('Load this template? Current canvas will be replaced.')) {
      const template = templates[templateIndex];
      setElements(template.elements);
      setHistory([template.elements]);
      setHistoryStep(0);
      setShowTemplateMenu(false);
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

      {/* Enhanced Toolbar */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-2xl relative z-10"
      >
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          {/* Top Row - Title and Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard')}
                className="p-3 hover:bg-primary/10 rounded-xl transition-all duration-300 group"
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
                  className="text-2xl font-bold px-3 py-2 border-2 border-primary rounded-xl focus:outline-none bg-background text-foreground shadow-lg"
                  autoFocus
                />
              ) : (
                <motion.h1
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setIsEditingName(true)}
                  className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent cursor-pointer"
                >
                  {whiteboardName}
                </motion.h1>
              )}
              
              {saving && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/30"
                >
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-primary">Saving...</span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500/20 to-teal-500/20 hover:from-green-500/30 hover:to-teal-500/30 rounded-xl transition-all duration-300 text-sm font-bold text-green-600 dark:text-green-400 border border-green-500/30 shadow-lg shadow-green-500/10"
                >
                  <FileText className="w-4 h-4" />
                  <span>Templates</span>
                </motion.button>

                <AnimatePresence>
                  {showTemplateMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full mt-2 left-0 bg-card/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-4 z-50 w-96"
                    >
                      <h3 className="text-lg font-bold mb-4">Choose a Template</h3>
                      <div className="space-y-2">
                        {templates.map((template, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.02, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => loadTemplate(index)}
                            className="w-full p-4 bg-accent/50 hover:bg-accent rounded-xl transition-all text-left border-2 border-transparent hover:border-primary/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{template.icon}</span>
                              <div className="flex-1">
                                <h4 className="font-bold text-sm">{template.name}</h4>
                                <p className="text-xs text-foreground/60">{template.description}</p>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCollabModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 rounded-xl transition-all duration-300 text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10"
              >
                <Users className="w-4 h-4" />
                <span>Collaborate</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 rounded-xl transition-all duration-300 text-sm font-bold text-white shadow-lg shadow-primary/30"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 rounded-xl transition-all duration-300 text-sm font-bold text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/10"
                title="Clear Canvas"
              >
                <Eraser className="w-4 h-4" />
                <span>Clear</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 rounded-xl transition-all duration-300 text-sm font-bold text-red-600 dark:text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10"
                title="Delete Whiteboard"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </motion.button>
            </div>
          </div>

          {/* Bottom Row - Drawing Tools */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Selection & Comments */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 bg-accent/50 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-border/50"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('select')}
                title="Select (V)"
                className={`p-3 rounded-lg transition-all ${tool === 'select' ? 'bg-primary text-white shadow-lg shadow-primary/50 scale-105' : 'hover:bg-background/70'}`}
              >
                <MousePointer className="w-4 h-4" />
              </motion.button>
              
              <AnimatePresence>
                {selectedElement && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: 'auto' }}
                    exit={{ opacity: 0, scale: 0.5, width: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCommentsPanel(!showCommentsPanel)}
                    title="Comments"
                    className={`p-3 rounded-lg transition-all ${showCommentsPanel ? 'bg-green-500 text-white shadow-lg shadow-green-500/50 scale-105' : 'hover:bg-background/70'}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Drawing Tools */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center gap-1 bg-accent/50 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-border/50"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('pen')}
                title="Pen (P)"
                className={`p-3 rounded-lg transition-all ${tool === 'pen' ? 'bg-primary text-white shadow-lg shadow-primary/50 scale-105' : 'hover:bg-background/70'}`}
              >
                <Pen className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('eraser')}
                title="Eraser (E)"
                className={`p-3 rounded-lg transition-all ${tool === 'eraser' ? 'bg-primary text-white shadow-lg shadow-primary/50 scale-105' : 'hover:bg-background/70'}`}
              >
                <Eraser className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('text')}
                title="Text (T)"
                className={`p-3 rounded-lg transition-all ${tool === 'text' ? 'bg-primary text-white shadow-lg shadow-primary/50 scale-105' : 'hover:bg-background/70'}`}
              >
                <Type className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTool('sticky')}
                title="Sticky Note (S)"
                className={`p-3 rounded-lg transition-all ${tool === 'sticky' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/50 scale-105' : 'hover:bg-background/70'}`}
              >
                <FileText className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                title="Add Image (I)"
                className="p-3 rounded-lg transition-all hover:bg-background/70"
              >
                <ImageIcon className="w-4 h-4" />
              </motion.button>
            </motion.div>

            {/* Shapes */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1 bg-accent/50 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-border/50"
            >
              {SHAPES.map(({ tool: shapeTool, icon: Icon, label }) => (
                <motion.button
                  key={shapeTool}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTool(shapeTool)}
                  title={label}
                  className={`p-3 rounded-lg transition-all ${tool === shapeTool ? 'bg-primary text-white shadow-lg shadow-primary/50 scale-105' : 'hover:bg-background/70'}`}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </motion.div>

            <div className="h-8 w-px bg-border" />

            {/* Color Picker */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-3 px-4 py-3 bg-accent/50 hover:bg-accent/70 rounded-xl transition-all shadow-lg border border-border/50"
              >
                <div className="w-6 h-6 rounded-lg border-2 border-white shadow-md" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold">Color</span>
                <ChevronDown className="w-4 h-4" />
              </motion.button>

              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 bg-card/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-6 z-50 w-80"
                  >
                    <h3 className="text-sm font-bold mb-3">Preset Colors</h3>
                    <div className="grid grid-cols-6 gap-2 mb-4">
                      {PRESET_COLORS.map(col => (
                        <motion.button
                          key={col}
                          whileHover={{ scale: 1.15, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${color === col ? 'border-primary ring-4 ring-primary/30 scale-110' : 'border-border/50'}`}
                          style={{ backgroundColor: col }}
                          onClick={() => {
                            handleColorChange(col);
                            setShowColorPicker(false);
                          }}
                        />
                      ))}
                    </div>
                    
                    <div className="border-t border-border pt-4">
                      <h3 className="text-sm font-bold mb-3">Custom Color</h3>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="w-14 h-12 rounded-xl cursor-pointer border-2 border-border"
                        />
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => {
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                              setCustomColor(e.target.value);
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-background"
                        />
                        <button
                          onClick={() => {
                            handleColorChange(customColor);
                            setShowColorPicker(false);
                          }}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition shadow-lg"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stroke Width */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowStrokeMenu(!showStrokeMenu)}
                className="flex items-center gap-3 px-4 py-3 bg-accent/50 hover:bg-accent/70 rounded-xl transition-all shadow-lg border border-border/50"
              >
                <div className="w-6 h-1 rounded-full bg-foreground" style={{ height: `${strokeWidth}px` }} />
                <span className="text-sm font-semibold">{strokeWidth}px</span>
                <ChevronDown className="w-4 h-4" />
              </motion.button>

              <AnimatePresence>
                {showStrokeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 bg-card/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-6 z-50 w-72"
                  >
                    <h3 className="text-sm font-bold mb-3">Stroke Width</h3>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full accent-primary mb-4"
                    />
                    <div className="flex gap-2">
                      {[1, 3, 5, 10, 20].map(size => (
                        <button
                          key={size}
                          onClick={() => {
                            setStrokeWidth(size);
                            setShowStrokeMenu(false);
                          }}
                          className={`flex-1 py-3 rounded-xl border-2 transition-all ${strokeWidth === size ? 'border-primary bg-primary/10 scale-105' : 'border-border/50 hover:border-primary/50'}`}
                        >
                          <div className="w-full flex justify-center">
                            <div className="rounded-full bg-foreground" style={{ width: `${size * 2}px`, height: `${size}px` }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-border" />

            {/* History Controls */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-1 bg-accent/50 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-border/50"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUndo}
                disabled={historyStep === 0}
                title="Undo (Ctrl+Z)"
                className="p-3 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-background/70"
              >
                <Undo className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRedo}
                disabled={historyStep >= history.length - 1}
                title="Redo (Ctrl+Y)"
                className="p-3 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-background/70"
              >
                <Redo className="w-4 h-4" />
              </motion.button>
            </motion.div>

            {/* Fullscreen */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
              className={`p-3 rounded-xl transition-all shadow-lg ${isFullscreen ? 'bg-primary text-white shadow-primary/50' : 'bg-accent/50 hover:bg-accent/70 border border-border/50'}`}
            >
              <Maximize2 className="w-4 h-4" />
            </motion.button>

            <div className="h-8 w-px bg-border" />

            {/* Layers Panel */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 rounded-xl transition-all shadow-lg border border-purple-500/30"
              >
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Layer</span>
                  <span className="text-sm font-bold">{layers[currentLayer]}</span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </motion.button>

              <AnimatePresence>
                {showLayerMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 right-0 bg-card/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-4 z-50 w-80"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold">Layers</h3>
                      <button
                        onClick={addLayer}
                        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition"
                      >
                        + New Layer
                      </button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {layers.map((layer, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            currentLayer === index
                              ? 'border-primary bg-primary/10 shadow-lg'
                              : 'border-border/50 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <input
                              type="text"
                              value={layer}
                              onChange={(e) => renameLayer(index, e.target.value)}
                              className="flex-1 px-2 py-1 bg-transparent border-none outline-none font-semibold text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setCurrentLayer(index)}
                                className={`px-2 py-1 rounded text-xs font-bold transition ${
                                  currentLayer === index
                                    ? 'bg-primary text-white'
                                    : 'bg-accent hover:bg-accent/70'
                                }`}
                              >
                                {currentLayer === index ? 'Active' : 'View'}
                              </button>
                              {layers.length > 1 && (
                                <button
                                  onClick={() => deleteLayer(index)}
                                  className="p-1 hover:bg-red-500/20 text-red-500 rounded transition"
                                  title="Delete Layer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => moveLayerUp(index)}
                              disabled={index === 0}
                              className="flex-1 px-2 py-1 bg-accent hover:bg-accent/70 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs font-semibold transition"
                              title="Move Up"
                            >
                              ↑ Up
                            </button>
                            <button
                              onClick={() => moveLayerDown(index)}
                              disabled={index === layers.length - 1}
                              className="flex-1 px-2 py-1 bg-accent hover:bg-accent/70 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs font-semibold transition"
                              title="Move Down"
                            >
                              ↓ Down
                            </button>
                            <span className="text-xs text-foreground/50">
                              {elements.filter(el => (el.layer || 0) === index).length} items
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      <div ref={containerRef} className="flex-1 w-full relative overflow-hidden bg-grid">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full"
        />
        
        {/* Comments Panel */}
        <AnimatePresence>
          {showCommentsPanel && selectedElement && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 h-full w-96 bg-card border-l border-border shadow-2xl flex flex-col z-10"
            >
              <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <h2 className="font-bold text-lg">Comments</h2>
                <button onClick={() => setShowCommentsPanel(false)} className="p-1 hover:bg-accent rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center text-secondary-foreground py-10">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No comments yet.</p>
                    <p className="text-sm">Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <img 
                        src={comment.profiles?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${comment.profiles?.username || '?'}`}
                        alt={comment.profiles?.username || 'user'}
                        className="w-8 h-8 rounded-full bg-accent"
                      />
                      <div className="flex-1 bg-accent/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{comment.profiles?.username || 'Anonymous'}</span>
                          <span className="text-xs text-secondary-foreground/70">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm">{comment.comment_text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-background"
                  />
                  <button onClick={addComment} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition">
                    Post
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
                  className="p-1.5 hover:bg-accent rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {collaborators.length === 0 ? (
                  <p className="text-sm text-foreground/50 text-center py-4">No collaborators yet</p>
                ) : (
                  collaborators.map((collab: any) => (
                    <div
                      key={collab.user_id}
                      className="flex items-center justify-between p-3 bg-accent/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <img src={collab.profiles?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${collab.profiles?.username || '?'}`} alt={collab.profiles?.username} className="w-8 h-8 rounded-full" />
                        <span className="font-semibold text-sm">{collab.profiles?.username || '...'}</span>
                      </div>
                      <button onClick={() => removeCollaborator(collab.user_id)} className="text-red-500 hover:text-red-600 font-semibold text-sm">Remove</button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={collaboratorEmail}
                  onChange={(e) => setCollaboratorEmail(e.target.value)}
                  placeholder="Enter username..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-background"
                />
                <button onClick={addCollaborator} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition">Add</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold text-foreground mb-2">Delete Whiteboard</h2>
              <p className="text-secondary-foreground mb-6">Are you sure you want to delete "{whiteboardName}"? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg font-semibold transition">Cancel</button>
                <button onClick={deleteWhiteboard} className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg font-semibold transition">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}