import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Users, Zap, Brain, FileText, Share2 } from 'lucide-react';
import AuthModal from './AuthModal';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">WhiteboardAI</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <button
              onClick={() => openAuth('signin')}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
            >
              Get Started
            </button>
          </motion.div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Collaborate in
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {' '}Real-Time
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              An infinite canvas powered by AI. Draw, brainstorm, and take notes with intelligent features
              that enhance your creativity and productivity.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openAuth('signup')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50"
            >
              Start Creating Free
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-500/20 blur-3xl rounded-full"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 aspect-video flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="w-20 h-20 text-blue-600 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Interactive Demo Preview</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Everything you need to create
            </h2>
            <p className="text-xl text-slate-600">Powerful features designed for modern collaboration</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all hover:shadow-lg group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                  <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Join thousands of teams already collaborating on WhiteboardAI
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openAuth('signup')}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg transition-all shadow-2xl hover:shadow-white/50"
            >
              Create Your Free Account
            </motion.button>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 px-6 bg-slate-900 text-center">
        <p className="text-slate-400">© 2025 WhiteboardAI. Built with collaboration in mind.</p>
      </footer>

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={(mode) => setAuthMode(mode)}
        />
      )}
    </div>
  );
}
