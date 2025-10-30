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

  // 1. Add tool mode state
  const [mode, setMode] = useState<'select'|'pen'|'highlighter'|'eraser'|'sticky'|'text'|'image'|'rectangle'|'ellipse'|'line'|'arrow'|'laser'|'fullscreen'>('pen');
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 2. Sticky note, image, and text states
  const [stickies, setStickies] = useState<{id:string, x:number, y:number, color:string, text:string}[]>([]);
  const [images, setImages] = useState<{id:string, x:number, y:number, url:string, width:number, height:number}[]>([]);
  const [textboxes, setTextboxes] = useState<{id:string, x:number, y:number, color:string, text:string}[]>([]);
  const [showStickyInput, setShowStickyInput] = useState<{open:boolean, x:number, y:number}>({open:false,x:0,y:0});
  const [stickyInputText, setStickyInputText] = useState('');

  // 3. Toolbar rendering
  const renderToolbar = () => (
    <div className={
      'fixed top-1/2 left-4 -translate-y-1/2 z-50 bg-white/90 rounded-xl p-2 flex flex-col items-center shadow-lg border border-slate-300 space-y-2'+
       (isFullscreen ? ' left-8' : '')
    }>
      <button className={`p-2 rounded ${mode==='select'?'bg-blue-200':''}`} onClick={()=>setMode('select')} title="Select"><ArrowLeft /></button>
      <button className={`p-2 rounded ${mode==='pen'?'bg-blue-200':''}`} onClick={()=>setMode('pen')} title="Pen (freehand)"><Pen /></button>
      <button className={`p-2 rounded ${mode==='highlighter'?'bg-yellow-100':''}`} onClick={()=>setMode('highlighter')} title="Highlighter"><Type /></button>
      <button className={`p-2 rounded ${mode==='eraser'?'bg-blue-200':''}`} onClick={()=>setMode('eraser')} title="Eraser"><Eraser /></button>
      <div className="border-t my-2 w-10 mx-auto border-slate-200"></div>
      <button className={`p-2 rounded ${mode==='sticky'?'bg-yellow-300/70':''}`} onClick={()=>setMode('sticky')} title="Sticky Note">📝</button>
      <button className={`p-2 rounded ${mode==='text'?'bg-blue-100':''}`} onClick={()=>setMode('text')} title="Text Box"><Type /></button>
      <button className={`p-2 rounded ${mode==='image'?'bg-green-100':''}`} onClick={()=>setMode('image')} title="Insert Image">🖼️</button>
      <div className="border-t my-2 w-10 mx-auto border-slate-200"></div>
      <button className={`p-2 rounded ${mode==='rectangle'?'bg-blue-100':''}`} onClick={()=>setMode('rectangle')} title="Rectangle"><Square /></button>
      <button className={`p-2 rounded ${mode==='ellipse'?'bg-blue-100':''}`} onClick={()=>setMode('ellipse')} title="Ellipse"><Circle /></button>
      <button className={`p-2 rounded ${mode==='line'?'bg-blue-100':''}`} onClick={()=>setMode('line')} title="Line"><Minus /></button>
      <button className={`p-2 rounded ${mode==='arrow'?'bg-blue-100':''}`} onClick={()=>setMode('arrow')} title="Arrow"><ArrowRight /></button>
      <div className="border-t my-2 w-10 mx-auto border-slate-200"></div>
      <button className={`p-2 rounded ${mode==='laser'?'bg-pink-200':''}`} onClick={()=>setMode('laser')} title="Laser Pointer">🔦</button>
      <button className={`p-2 rounded ${isFullscreen?'bg-slate-500 text-white':'bg-slate-100'}`} onClick={()=>toggleFullscreen()} title="Fullscreen">🖥️</button>
    </div>
  );

  // 4. Fullscreen toggle logic
  const toggleFullscreen = () => {
    setIsFullscreen(f => !f);
    // Optionally trigger browser fullscreen with document.documentElement.requestFullscreen()
  };
  React.useEffect(()=>{
    const onEsc = (e:KeyboardEvent)=>{ if (isFullscreen && e.key==='Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onEsc);
    return ()=>window.removeEventListener('keydown', onEsc);
  },[isFullscreen]);

  // 5. Add handlers for each mode (stub, TODO)
  const handleStickyNote = (x:number, y:number) => {
    setShowStickyInput({open:true, x, y});
  };
  const addSticky = () => {
    setStickies(s => [...s, {id:crypto.randomUUID(), x:showStickyInput.x, y:showStickyInput.y, color:'#FFEB3B', text:stickyInputText||'New Note'}]);
    setShowStickyInput({open:false, x:0, y:0}); setStickyInputText('');
  };
  // TODO: Add handlers for image placing, textbox, laser pointer, brush types, etc.

  // 6. Update return block to render toolbar, fullscreen states, and tool UIs
  return (
    <div className={isFullscreen ? 'fixed inset-0 bg-slate-50 z-50 flex':'h-screen flex flex-col bg-slate-50'}>
      {renderToolbar()}
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
      {/* Add sticky note input modal overlay if showStickyInput.open */}
      {showStickyInput.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <textarea className="border rounded p-2 mb-2 w-72 h-24" value={stickyInputText} autoFocus onChange={e=>setStickyInputText(e.target.value)} placeholder="Sticky note text..." />
            <button className="bg-yellow-400 px-5 py-2 rounded font-bold" onClick={addSticky}>Add Sticky Note</button>
            <button className="mt-2 text-sm text-slate-500 underline" onClick={()=>setShowStickyInput({open:false,x:0,y:0})}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
