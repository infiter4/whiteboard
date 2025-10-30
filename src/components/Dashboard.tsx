import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Grid3x3,
  List,
  Search,
  User,
  FileText,
  Layout,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Whiteboard, Note } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'whiteboards' | 'notes'>('whiteboards');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setProfileLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', user.id)
          .maybeSingle();
        
        // Prefer full_name for Google users, fallback to username or email
        setProfileUsername(data?.full_name || data?.username || user.email?.split('@')[0] || null);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);

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
    <div className="min-h-screen bg-background">
      <nav className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.div 
              className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <span className="text-2xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">WhiteboardAI</span>
          </motion.div>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg hover:bg-accent/80 transition">
                <User className="w-4 h-4 text-secondary-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {profileLoading
                    ? '...'
                    : profileUsername || user?.email}
                </span>
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
                <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-card shadow-lg ring-1 ring-black/5 focus:outline-none p-2">
                  <div className="px-3 py-2">
                    <div className="font-semibold text-base text-foreground">{user?.user_metadata?.username || user?.email}</div>
                    {user?.user_metadata?.username && <div className="text-xs text-secondary-foreground/80 mt-1">{user?.email}</div>}
                  </div>
                  <button
                    className="w-full text-left mt-2 px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold text-sm"
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
            <h1 className="text-4xl font-bold text-foreground mb-2">My Workspace</h1>
            <p className="text-secondary-foreground">Create, organize, and collaborate</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={activeTab === 'whiteboards' ? createWhiteboard : createNote}
            className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:from-blue-700 hover:via-purple-700 hover:to-cyan-600 text-white rounded-2xl font-bold shadow-2xl shadow-blue-500/30 hover:shadow-purple-500/50 transition-all relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New {activeTab === 'whiteboards' ? 'Whiteboard' : 'Note'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
          </motion.button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm mb-6">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('whiteboards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'whiteboards'
                    ? 'bg-primary/10 text-primary'
                    : 'text-secondary-foreground hover:bg-background'
                }`}
              >
                <Layout className="w-4 h-4" />
                Whiteboards
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'notes'
                    ? 'bg-primary/10 text-primary'
                    : 'text-secondary-foreground hover:bg-background'
                }`}
              >
                <FileText className="w-4 h-4" />
                Notes
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all w-64"
                />
              </div>
              <div className="flex items-center gap-1 p-1 bg-accent rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'grid' ? 'bg-card shadow-sm' : 'hover:bg-accent/80'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4 text-secondary-foreground" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'list' ? 'bg-card shadow-sm' : 'hover:bg-accent/80'
                  }`}
                >
                  <List className="w-4 h-4 text-secondary-foreground" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-secondary-foreground/80">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'whiteboards' ? (
                    <Layout className="w-8 h-8 text-secondary-foreground/50" />
                  ) : (
                    <FileText className="w-8 h-8 text-secondary-foreground/50" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No {activeTab} yet
                </h3>
                <p className="text-secondary-foreground mb-6">
                  Create your first {activeTab === 'whiteboards' ? 'whiteboard' : 'note'} to get
                  started
                </p>
                <button
                  onClick={activeTab === 'whiteboards' ? createWhiteboard : createNote}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-all"
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
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() =>
                      navigate(
                        activeTab === 'whiteboards' ? `/whiteboard/${item.id}` : `/note/${item.id}`
                      )
                    }
                    className="group relative cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                      <div className="aspect-video bg-gradient-to-br from-accent via-accent/50 to-accent flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5"></div>
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {activeTab === 'whiteboards' ? (
                            <Layout className="w-16 h-16 text-primary/40 relative z-10" />
                          ) : (
                            <FileText className="w-16 h-16 text-primary/40 relative z-10" />
                          )}
                        </motion.div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate mb-2">
                          {'name' in item ? item.name : item.title}
                        </h3>
                        <p className="text-sm text-secondary-foreground/80 flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full"></span>
                          {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <motion.div
                        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-cyan-500"
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                      ></motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 8, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    onClick={() =>
                      navigate(
                        activeTab === 'whiteboards' ? `/whiteboard/${item.id}` : `/note/${item.id}`
                      )
                    }
                    className="group relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-5 p-5 bg-card/80 backdrop-blur-sm border border-border rounded-xl cursor-pointer hover:border-primary/50 hover:shadow-xl transition-all">
                      <motion.div 
                        className="w-14 h-14 bg-gradient-to-br from-primary/20 via-purple-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {activeTab === 'whiteboards' ? (
                          <Layout className="w-7 h-7 text-primary" />
                        ) : (
                          <FileText className="w-7 h-7 text-primary" />
                        )}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate mb-1">
                          {'name' in item ? item.name : item.title}
                        </h3>
                        <p className="text-sm text-secondary-foreground/80 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                          Updated {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <motion.div
                        className="text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        →
                      </motion.div>
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
