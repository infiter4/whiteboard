import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Circle,
  Square,
  Type,
  Minus,
  ArrowRight,
  Pen,
  Eraser,
  Hand,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import React from 'react';
import { Menu, Transition } from '@headlessui/react';

interface CollaboratorProfile {
  id: string;
  username: string;
  user_color: string;
  role: 'owner' | 'editor' | 'viewer';
  email?: string;
}

type Tool =
  | 'pen'
  | 'eraser'
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'pan';

type DrawingElement = {
  id: string;
  type: Tool;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  userId: string;
};

export default function Whiteboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [history, setHistory] = useState<DrawingElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [whiteboardName, setWhiteboardName] = useState('Untitled Whiteboard');
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [collaborators, setCollaborators] = useState<CollaboratorProfile[]>([]);
  const [profileDialog, setProfileDialog] = useState<{ open: boolean; user: CollaboratorProfile | null }>({ open: false, user: null });

  // fetch all user info on load or id change
  useEffect(() => {
    if (!id) return;
    (async () => {
      // get whiteboard for owner
      const { data: wdata, error: werr } = await supabase.from('whiteboards').select('owner_id').eq('id', id).single();
      if (werr || !wdata) return;
      // get collaborators (with roles)
      const { data: collabs, error: collabErr } = await supabase.from('whiteboard_collaborators').select('user_id,role').eq('whiteboard_id', id);
      if (collabErr) return;
      // gather all user ids (owner + collaborators, without duplicate)
      const ids = [wdata.owner_id, ...(collabs?.map((c: any) => c.user_id).filter((uid: string) => uid !== wdata.owner_id) || [])];
      const userRoles: { [key: string]: 'owner' | 'editor' | 'viewer' } = { [wdata.owner_id]: 'owner', ...(collabs?.reduce((acc: any, c: any) => ({ ...acc, [c.user_id]: c.role }), {})) };
      // fetch all profiles with username, email, user_color
      const { data: users, error: usersErr } = await supabase.from('profiles').select('id,username,user_color').in('id', ids);
      if (usersErr) return;
      // Map all roles and profile data together
      const all: CollaboratorProfile[] = users.map((u: any) => ({ ...u, role: userRoles[u.id] }));
      setCollaborators(all);
    })();
  }, [id]);

  useEffect(() => {
    if (elements.length > 0) {
      redrawCanvas();
    }
  }, [elements, zoom]);

  const saveWhiteboard = async () => {
    if (!id || !user) return;

    try {
      const { error } = await supabase
        .from('whiteboards')
        .update({
          canvas_data: { elements },
          name: whiteboardName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving whiteboard:', error);
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, 0); // Removed pan.x, pan.y
    ctx.scale(zoom, zoom);

    elements.forEach((element) => {
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (element.type) {
        case 'pen':
        case 'eraser':
          if (element.points && element.points.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(element.points[0], element.points[1]);
            for (let i = 2; i < element.points.length; i += 2) {
              ctx.lineTo(element.points[i], element.points[i + 1]);
            }
            ctx.strokeStyle = element.type === 'eraser' ? '#ffffff' : element.color;
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (element.x !== undefined && element.y !== undefined && element.width && element.height) {
            ctx.strokeRect(element.x, element.y, element.width, element.height);
          }
          break;

        case 'circle':
          if (element.x !== undefined && element.y !== undefined && element.radius) {
            ctx.beginPath();
            ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case 'line':
        case 'arrow':
          if (element.x1 !== undefined && element.y1 !== undefined && element.x2 !== undefined && element.y2 !== undefined) {
            ctx.beginPath();
            ctx.moveTo(element.x1, element.y1);
            ctx.lineTo(element.x2, element.y2);
            ctx.stroke();

            if (element.type === 'arrow') {
              const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
              const headLength = 15;
              ctx.beginPath();
              ctx.moveTo(element.x2, element.y2);
              ctx.lineTo(
                element.x2 - headLength * Math.cos(angle - Math.PI / 6),
                element.y2 - headLength * Math.sin(angle - Math.PI / 6)
              );
              ctx.moveTo(element.x2, element.y2);
              ctx.lineTo(
                element.x2 - headLength * Math.cos(angle + Math.PI / 6),
                element.y2 - headLength * Math.sin(angle + Math.PI / 6)
              );
              ctx.stroke();
            }
          }
          break;

        case 'text':
          if (element.x !== undefined && element.y !== undefined && element.text) {
            ctx.font = '16px sans-serif';
            ctx.fillStyle = element.color;
            ctx.fillText(element.text, element.x, element.y);
          }
          break;
      }
    });

    ctx.restore();
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!user || tool === 'pan') return;

    const pos = getMousePos(e);
    setIsDrawing(true);

    const newElement: DrawingElement = {
      id: crypto.randomUUID(),
      type: tool,
      color,
      strokeWidth,
      userId: user.id,
    };

    if (tool === 'pen' || tool === 'eraser') {
      newElement.points = [pos.x, pos.y];
    } else if (tool === 'rectangle' || tool === 'circle') {
      newElement.x = pos.x;
      newElement.y = pos.y;
      newElement.width = 0;
      newElement.height = 0;
      newElement.radius = 0;
    } else if (tool === 'line' || tool === 'arrow') {
      newElement.x1 = pos.x;
      newElement.y1 = pos.y;
      newElement.x2 = pos.x;
      newElement.y2 = pos.y;
    }

    setCurrentElement(newElement);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElement) return;

    const pos = getMousePos(e);

    if (tool === 'pen' || tool === 'eraser') {
      const updatedElement = {
        ...currentElement,
        points: [...(currentElement.points || []), pos.x, pos.y],
      };
      setCurrentElement(updatedElement);
      setElements([...elements, updatedElement]);
    } else if (tool === 'rectangle') {
      const updatedElement = {
        ...currentElement,
        width: pos.x - (currentElement.x || 0),
        height: pos.y - (currentElement.y || 0),
      };
      setCurrentElement(updatedElement);
    } else if (tool === 'circle') {
      const dx = pos.x - (currentElement.x || 0);
      const dy = pos.y - (currentElement.y || 0);
      const radius = Math.sqrt(dx * dx + dy * dy);
      const updatedElement = {
        ...currentElement,
        radius,
      };
      setCurrentElement(updatedElement);
    } else if (tool === 'line' || tool === 'arrow') {
      const updatedElement = {
        ...currentElement,
        x2: pos.x,
        y2: pos.y,
      };
      setCurrentElement(updatedElement);
    }

    redrawCanvas();
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentElement) return;

    setIsDrawing(false);
    const newElements = [...elements, currentElement];
    setElements(newElements);
    setHistory([...history.slice(0, historyStep + 1), newElements]);
    setHistoryStep(historyStep + 1);
    setCurrentElement(null);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setElements(history[historyStep - 1]);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setElements(history[historyStep + 1]);
    }
  };

  const colors = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  const handleInvite = async () => {
    if (!id || !user || inviteEmail.trim() === "") return;
    setInviteStatus("");
    // 1. Lookup user by email
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", inviteEmail.trim()) // if you use email in profiles, otherwise fetch from auth.users via edge function or RPC
      .limit(1);

    if (error) return setInviteStatus("Error finding user.");
    if (!users || users.length === 0) {
      setInviteStatus("No user found with that email or username.");
      return;
    }
    const invitedUserId = users[0].id;
    // 2. Insert to collaborators
    const { error: collabError } = await supabase
      .from("whiteboard_collaborators")
      .insert({ whiteboard_id: id, user_id: invitedUserId, role: "editor" });
    if (collabError) {
      if (collabError.code === '23505') {
        setInviteStatus("User is already a collaborator.");
      } else {
        setInviteStatus("Error inviting user.");
      }
      return;
    }
    setInviteStatus("User invited as collaborator!");
    setInviteEmail("");
  };

  const showProfile = (user: CollaboratorProfile) => setProfileDialog({ open: true, user });
  const closeProfile = () => setProfileDialog({ open: false, user: null });

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <input
            type="text"
            value={whiteboardName}
            onChange={(e) => setWhiteboardName(e.target.value)}
            onBlur={saveWhiteboard}
            className="text-lg font-semibold text-slate-900 bg-transparent border-none outline-none focus:bg-slate-50 px-2 py-1 rounded"
          />
        </div>

        <div className="flex items-center gap-4">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
              <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white bg-blue-500">
                {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="text-white font-medium text-sm">{user?.user_metadata?.username || user?.email}</span>
            </Menu.Button>
            <Transition
              as={React.Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95">
              <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none p-2">
                <div className="px-3 py-2">
                  <div className="font-semibold text-base text-slate-800">{user?.user_metadata?.username || user?.email}</div>
                  <div className="text-xs text-slate-500 mt-1">{user?.email}</div>
                </div>
                <button
                  className="w-full text-left mt-2 px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition font-semibold text-sm"
                  onClick={async () => { await signOut(); navigate('/'); }}
                >
                  Logout
                </button>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('select')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'select' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Select"
          >
            <Hand className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'pen' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Pen"
          >
            <Pen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Eraser"
          >
            <Eraser className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-2" />

          <button
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'rectangle' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'circle' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Circle"
          >
            <Circle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'line' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Line"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('arrow')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'arrow' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Arrow"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'text' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Text"
          >
            <Type className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-2" />

          <div className="flex items-center gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  color === c ? 'border-blue-600 scale-110' : 'border-slate-200 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-px h-8 bg-slate-200 mx-2" />

          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-slate-600 w-8">{strokeWidth}px</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className="p-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="Undo"
          >
            <Undo className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={redo}
            disabled={historyStep >= history.length - 1}
            className="p-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="Redo"
          >
            <Redo className="w-5 h-5 text-slate-600" />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-2" />

          <button
            onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-slate-600" />
          </button>
          <span className="text-sm text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {user && (
        <div className="flex gap-2 items-center px-6 py-2">
          <input
            type="text"
            className="border p-2 rounded flex-1"
            placeholder="Invite user by username..."
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
          />
          <button onClick={handleInvite} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white rounded">
            Invite
          </button>
          {inviteStatus && <span className="text-sm ml-2">{inviteStatus}</span>}
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight - 150}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair bg-white"
        />
      </div>

      <div className="flex items-center gap-3">
        {collaborators.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-2 bg-white shadow rounded-full px-3 py-1 cursor-pointer hover:shadow-lg transition group border-2 ${c.id===user?.id?'border-blue-500':'border-slate-200'}`}
            style={{ boxShadow: '0 2px 8px #0001' }}
            onClick={() => showProfile(c)}
          >
            <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white" style={{ background: c.user_color||'#555' }}>
              {c.username?.slice(0,2).toUpperCase()}
            </span>
            <span className="font-medium text-slate-700 group-hover:text-blue-600 text-sm" title={c.role}>
              {c.username}
            </span>
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${c.role==='owner'?'bg-blue-100 text-blue-800':c.role==='editor'?'bg-green-100 text-green-800':'bg-slate-100 text-slate-500'}`}>{c.role}</span>
          </div>
        ))}
      </div>

      {/* Profile modal/dialog popover */}
      {profileDialog.open && profileDialog.user && (
       <div className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" />
          <div className="bg-white rounded-xl shadow-xl p-8 relative z-10 min-w-[300px] flex flex-col items-center">
            <span className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-3xl mb-2" style={{ background: profileDialog.user.user_color||'#555' }}>
              {profileDialog.user?.username?.slice(0,2).toUpperCase()}
            </span>
            <div className="text-xl font-semibold mb-1">{profileDialog.user?.username}</div>
            <div className="text-sm text-slate-500 mb-2">{profileDialog.user?.role?.toUpperCase()}</div>
            {/* Optionally display email here if available: <div className="text-sm text-slate-600 mb-1">{profileDialog.user.email}</div> */}
            <button className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={closeProfile}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
