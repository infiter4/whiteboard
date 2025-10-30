import { useState, useEffect } from 'react';
import {motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, Zap, Brain, FileText, Share2 } from 'lucide-react';
import AuthModal from './AuthModal';
import ThreeDBackground from './ThreeDBackground';
import { useTheme } from '../contexts/ThemeContext';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const features = [
    {
      icon: Users,
      title: 'Real-Time Collaboration',
      description: 'Work together seamlessly with live cursors, instant sync, and presence indicators.',
    },
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Automatic summaries, smart tagging, math autocomplete, and semantic search.',
    },
    {
      icon: Sparkles,
      title: 'Infinite Canvas',
      description: 'Draw, sketch, and brainstorm on an unlimited workspace with powerful tools.',
    },
    {
      icon: FileText,
      title: 'Smart Note-Taking',
      description: 'Organize notes with folders, tags, and AI-generated summaries for quick retrieval.',
    },
    {
      icon: Zap,
      title: 'Handwriting Recognition',
      description: 'Convert handwritten math to LaTeX and synthesize your personal handwriting.',
    },
    {
      icon: Share2,
      title: 'Easy Sharing',
      description: 'Share whiteboards with granular permissions: view-only, edit, or admin access.',
    },
  ];

  return (
    <>
      <ThreeDBackground />
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 w-full bg-background/50 backdrop-blur-xl border-b border-white/10 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex items-center gap-3"
            >
              <motion.div 
                className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">WhiteboardAI</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex items-center gap-4"
            >
              <motion.button
                onClick={() => openAuth('signin')}
                className="px-5 py-2.5 text-foreground/80 hover:text-foreground font-semibold transition-all rounded-lg hover:bg-white/10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign In
              </motion.button>
              <motion.button
                onClick={() => openAuth('signup')}
                className="px-7 py-2.5 bg-gradient-to-r from-primary via-purple-600 to-cyan-500 hover:shadow-primary/50 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary/30"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
            </motion.div>
          </div>
        </nav>

        <section className="pt-40 pb-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-purple-500/10 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center max-w-5xl mx-auto"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl md:text-7xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 leading-tight tracking-tighter mb-6"
              >
                Collaborate Visually, <br />
                <span className="bg-gradient-to-r from-primary via-purple-500 to-cyan-500 bg-clip-text text-transparent animate-gradient-x">
                  Create Instantly
                </span>
              </motion.h1>
              <motion.p 
                className="text-2xl text-foreground/80 mb-12 leading-relaxed max-w-3xl mx-auto font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                An infinite canvas powered by AI. Draw, brainstorm, and take notes with intelligent features
                that enhance your creativity and productivity.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openAuth('signup')}
                  className="group px-10 py-5 bg-gradient-to-r from-primary via-purple-600 to-cyan-500 hover:shadow-primary/50 text-white rounded-2xl font-bold text-xl transition-all shadow-2xl shadow-primary/30"
                  animate={{
                    scale: [1, 1.03, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Creating Free
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      →
                    </motion.span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
                </motion.button>
                              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="mt-24 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-cyan-500/30 blur-3xl rounded-full animate-pulse"></div>
              <motion.div 
                className="relative bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-12 aspect-video flex items-center justify-center overflow-hidden"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10"></div>
                <div className="text-center relative z-10">
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <Sparkles className="w-24 h-24 text-blue-600 mx-auto mb-6 drop-shadow-lg" />
                  </motion.div>
                  <p className="text-slate-700 text-xl font-semibold">Interactive Demo Preview</p>
                  <p className="text-slate-500 text-sm mt-2">Experience the future of collaboration</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="py-32 px-6 bg-gradient-to-b from-background via-background/90 to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]"></div>
          
          <div className="max-w-7xl mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                className="inline-block mb-4 px-5 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-full border border-blue-500/20"
              >
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  🚀 Powerful Features
                </span>
              </motion.div>
              <h2 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-6">
                Everything you need to create
              </h2>
              <p className="text-xl text-foreground/80 max-w-2xl mx-auto">Powerful features designed for modern collaboration</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-primary via-purple-600 to-cyan-500 rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 overflow-hidden transition-all duration-300 animate-gradient-x"
                >
                  <div className="relative p-8 bg-background/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
                    <motion.div 
                      className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl group-hover:shadow-blue-500/50 transition-all duration-300"
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <feature.icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-foreground/80 leading-relaxed">{feature.description}</p>
                    <motion.div
                      className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                    ></motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 px-6 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
          
          <div className="max-w-5xl mx-auto text-center relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"
              ></motion.div>
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [360, 180, 0]
                }}
                transition={{ 
                  duration: 15,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -bottom-20 -right-20 w-60 h-60 bg-cyan-400/10 rounded-full blur-3xl"
              ></motion.div>
              
              <h2 className="text-5xl md:text-7xl font-black text-primary-foreground mb-8 leading-tight">
                Ready to get started?
              </h2>
              <p className="text-2xl text-primary-foreground/80 mb-12 max-w-2xl mx-auto leading-relaxed">
                Join thousands of teams already collaborating on WhiteboardAI
              </p>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openAuth('signup')}
                className="group px-12 py-6 bg-primary-foreground text-primary rounded-2xl font-bold text-xl transition-all shadow-2xl hover:shadow-primary-foreground/50 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Create Your Free Account
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/20 to-blue-600/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
              </motion.button>
              
            </motion.div>
          </div>
        </section>

        
        <AnimatePresence>
          {showAuthModal && (
            <AuthModal
              mode={authMode}
              onClose={() => setShowAuthModal(false)}
              onSwitchMode={(newMode) => setAuthMode(newMode)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
