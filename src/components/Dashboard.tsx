import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Grid3x3,
  List,
  Search,
  LogOut,
  User,
  FileText,
  Layout,
  Folder,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Whiteboard, Note } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import React from 'react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'whiteboards' | 'notes'>('whiteboards');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab, user]);

  // Fetches all whiteboards owned by user or where user is a collaborator
  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (activeTab === 'whiteboards') {
        // 1. Whiteboards owned by the user
        const { data: ownedWhiteboards, error: ownedError } = await supabase
          .from('whiteboards')
          .select('*')
          .eq('owner_id', user.id);
        if (ownedError) throw ownedError;

        // 2. Find IDs of whiteboards where user is a collaborator
        const { data: collabLinks, error: collabLinksError } = await supabase
          .from('whiteboard_collaborators')
          .select('whiteboard_id')
          .eq('user_id', user.id);
        if (collabLinksError) throw collabLinksError;

        const collabIds = collabLinks?.map((c) => c.whiteboard_id) || [];
        let collabWhiteboards: any[] = [];
        if (collabIds.length > 0) {
          const { data: collabs, error: collabFetchError } = await supabase
            .from('whiteboards')
            .select('*')
            .in('id', collabIds)
            ;
          if (collabFetchError) throw collabFetchError;
          collabWhiteboards = collabs || [];
        }
        // Merge, deduplicate (by id), and sort
        const mergedWhiteboards = [
          ...(ownedWhiteboards || []),
          ...collabWhiteboards.filter(wb => !ownedWhiteboards?.some(owb => owb.id === wb.id))
        ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        setWhiteboards(mergedWhiteboards);
      } else {
        // Notes logic unchanged
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        setNotes(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWhiteboard = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whiteboards')
        .insert({
          owner_id: user.id,
          name: 'Untitled Whiteboard',
          canvas_data: {},
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        navigate(`/whiteboard/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating whiteboard:', error);
    }
  };

  const createNote = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: 'Untitled Note',
          canvas_data: {},
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        navigate(`/note/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredWhiteboards = whiteboards.filter((wb) =>
    wb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const items = activeTab === 'whiteboards' ? filteredWhiteboards : filteredNotes;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">WhiteboardAI</span>
          </div>

          <div className="flex items-center gap-4">
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">{user?.user_metadata?.username || user?.email}</span>
              </Menu.Button>
              <Transition
                as={React.Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none p-2">
                  <div className="px-3 py-2">
                    <div className="font-semibold text-base text-slate-800">{user?.user_metadata?.username || user?.email}</div>
                    {user?.user_metadata?.username && <div className="text-xs text-slate-500 mt-1">{user?.email}</div>}
                  </div>
                  <button
                    className="w-full text-left mt-2 px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition font-semibold text-sm"
                    onClick={handleSignOut}
                  >
                    Logout
                  </button>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">My Workspace</h1>
            <p className="text-slate-600">Create, organize, and collaborate</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={activeTab === 'whiteboards' ? createWhiteboard : createNote}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            New {activeTab === 'whiteboards' ? 'Whiteboard' : 'Note'}
          </motion.button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('whiteboards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'whiteboards'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Layout className="w-4 h-4" />
                Whiteboards
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'notes'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Notes
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all w-64"
                />
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                  }`}
                >
                  <List className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'whiteboards' ? (
                    <Layout className="w-8 h-8 text-slate-400" />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No {activeTab} yet
                </h3>
                <p className="text-slate-600 mb-6">
                  Create your first {activeTab === 'whiteboards' ? 'whiteboard' : 'note'} to get
                  started
                </p>
                <button
                  onClick={activeTab === 'whiteboards' ? createWhiteboard : createNote}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Create {activeTab === 'whiteboards' ? 'Whiteboard' : 'Note'}
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -4 }}
                    onClick={() =>
                      navigate(
                        activeTab === 'whiteboards' ? `/whiteboard/${item.id}` : `/note/${item.id}`
                      )
                    }
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                  >
                    <div className="aspect-video bg-slate-100 flex items-center justify-center">
                      {activeTab === 'whiteboards' ? (
                        <Layout className="w-12 h-12 text-slate-300" />
                      ) : (
                        <FileText className="w-12 h-12 text-slate-300" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {'name' in item ? item.name : item.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ x: 4 }}
                    onClick={() =>
                      navigate(
                        activeTab === 'whiteboards' ? `/whiteboard/${item.id}` : `/note/${item.id}`
                      )
                    }
                    className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {activeTab === 'whiteboards' ? (
                        <Layout className="w-6 h-6 text-slate-400" />
                      ) : (
                        <FileText className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {'name' in item ? item.name : item.title}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Updated {new Date(item.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
