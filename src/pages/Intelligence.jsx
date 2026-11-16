import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ScrollText,
  Plus,
  Search,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Tag,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

const CATEGORIES = [
  { id: 'ALL', label: 'All Intel' },
  { id: 'FORMULA', label: 'Potion Formulas' },
  { id: 'CULT', label: 'Cult Activity' },
  { id: 'ARTIFACT', label: 'Sealed Artifacts' },
  { id: 'HISTORY', label: 'Ancient History' },
  { id: 'GENERAL', label: 'General Occult' }
];

export default function Intelligence() {
  const { user, socket } = useApp();
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('GENERAL');
  const [formSeq, setFormSeq] = useState(9);
  const [formTags, setFormTags] = useState('');
  const [formBody, setFormBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = async () => {
    try {
      const data = await api.getIntelligence({ category, search });
      setPosts(data);
    } catch (err) {
      toast.error('Failed to retrieve intelligence: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [category, search]);

  useEffect(() => {
    const unsubPost = socket.on('INTELLIGENCE_POST_CREATED', () => loadPosts());
    const unsubVerify = socket.on('INTELLIGENCE_VERIFIED', () => loadPosts());
    const unsubComment = socket.on('INTELLIGENCE_COMMENT_ADDED', (payload) => {
      if (selectedPost && selectedPost.id === payload.postId) {
        setSelectedPost((prev) => ({
          ...prev,
          comments: [...(prev.comments || []), payload.comment]
        }));
      }
      loadPosts();
    });
    const unsubReaction = socket.on('INTELLIGENCE_REACTION_UPDATED', (payload) => {
      if (selectedPost && selectedPost.id === payload.postId) {
        setSelectedPost((prev) => ({
          ...prev,
          reactions: payload.reactions
        }));
      }
      loadPosts();
    });

    return () => {
      unsubPost();
      unsubVerify();
      unsubComment();
      unsubReaction();
    };
  }, [socket, selectedPost]);

  const handleSelectPost = async (p) => {
    try {
      const full = await api.getIntelligencePost(p.id);
      setSelectedPost(full);
    } catch {
      setSelectedPost(p);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) {
      return toast.error('Title and report body required');
    }
    setSubmitting(true);
    try {
      await api.createIntelligence({
        title: formTitle.trim(),
        body: formBody.trim(),
        category: formCategory,
        sequenceRequired: formSeq,
        tags: formTags.trim()
      });
      toast.success('Intelligence recorded in the Tarot Archives.');
      setCreateModal(false);
      setFormTitle('');
      setFormBody('');
      setFormTags('');
      loadPosts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;
    setPostingComment(true);
    try {
      const newComment = await api.addComment(selectedPost.id, commentText.trim());
      setSelectedPost((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), newComment]
      }));
      setCommentText('');
      toast.success('Annotation affixed to parchment.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPostingComment(false);
    }
  };

  const handleToggleReaction = async (type) => {
    if (!selectedPost) return;
    try {
      const updatedReactions = await api.toggleReaction(selectedPost.id, type);
      setSelectedPost((prev) => ({
        ...prev,
        reactions: updatedReactions
      }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleVerify = async (status) => {
    if (!selectedPost) return;
    try {
      await api.verifyIntelligence(selectedPost.id, status);
      setSelectedPost((prev) => ({ ...prev, verificationStatus: status }));
      toast.success(`Report status set to ${status}`);
      loadPosts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.profile?.codename === 'The Fool';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bronze/40 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
            Intelligence Exchange
          </h1>
          <p className="text-xs text-bone/70 mt-1">
            Verified field reports, ancient historical codices, potion formulas, and cult movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModal(true)}
            className="btn flex items-center gap-1.5 bg-gold/15 text-gold border-gold"
          >
            <Plus size={14} />
            <span>Publish Report</span>
          </button>
          <button
            onClick={loadPosts}
            className="p-2 border border-bronze/50 hover:border-gold rounded text-gold transition"
            title="Refresh Intel"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded text-xs font-display transition shrink-0 border ${
                category === c.id
                  ? 'bg-crimson/40 text-gold border-gold'
                  : 'bg-void text-bone/70 border-bronze/40 hover:border-gold/60'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-bone/40" />
          <input
            className="inp pl-9 text-xs py-1.5"
            placeholder="Search intelligence keywords or tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Intel Parchment Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map(p => {
          const isVerified = p.verificationStatus === 'VERIFIED';
          const isDisputed = p.verificationStatus === 'DISPUTED';

          return (
            <motion.div
              key={p.id}
              whileHover={{ y: -3 }}
              onClick={() => handleSelectPost(p)}
              className="panel flex flex-col justify-between cursor-pointer hover:border-gold/70 transition bg-gradient-to-br from-fog/70 to-void border-bronze/50"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-display text-gold/80 text-[10px] uppercase tracking-wider">
                    {p.category}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-display uppercase tracking-wider font-semibold border ${
                      isVerified
                        ? 'bg-gold/15 text-gold border-gold'
                        : isDisputed
                        ? 'bg-crimson/20 text-crimson border-crimson'
                        : 'bg-void text-bone/50 border-bronze/30'
                    }`}
                  >
                    {isVerified ? '✦ Verified' : isDisputed ? '⚠ Disputed' : 'Unverified'}
                  </span>
                </div>

                <h3 className="font-display text-base text-gold font-bold line-clamp-2">
                  {p.title}
                </h3>

                <p className="text-xs text-bone/80 line-clamp-3 mt-2 leading-relaxed">
                  {p.body}
                </p>

                {p.tags && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.tags.split(',').map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-void/60 text-bone/60 border border-bronze/30"
                      >
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-bronze/30 flex items-center justify-between text-[11px] text-bone/60">
                <span className="font-display text-gold">
                  {p.author?.profile?.codename || p.author?.username}
                </span>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    <span>{p._count?.comments ?? p.comments?.length ?? 0}</span>
                  </span>
                  <span className="text-[10px] text-bone/40">
                    {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Post Reading & Discussion Modal */}
      <Modal
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        title={selectedPost?.title || 'Intelligence Parchment'}
      >
        {selectedPost && (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
            {/* Metadata Bar */}
            <div className="flex items-center justify-between p-2.5 rounded bg-void/80 border border-bronze/40">
              <div>
                <span className="text-gold font-display font-semibold text-xs">
                  Source: {selectedPost.author?.profile?.codename || selectedPost.author?.username}
                </span>
                <span className="text-[10px] text-bone/60 block">
                  Category: {selectedPost.category} · Seq {selectedPost.sequenceRequired} Required
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-display uppercase font-semibold border ${
                    selectedPost.verificationStatus === 'VERIFIED'
                      ? 'bg-gold/15 text-gold border-gold'
                      : 'bg-void text-bone/60 border-bronze/40'
                  }`}
                >
                  {selectedPost.verificationStatus}
                </span>

                {isAdmin && (
                  <button
                    onClick={() =>
                      handleVerify(
                        selectedPost.verificationStatus === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED'
                      )
                    }
                    className="text-[10px] text-gold hover:underline border border-bronze/40 px-2 py-0.5 rounded"
                  >
                    Toggle Seal
                  </button>
                )}
              </div>
            </div>

            {/* Document Body */}
            <div className="p-4 rounded bg-gradient-to-b from-fog/60 to-void/90 border border-bronze/40 shadow-inner">
              <p className="text-bone/90 whitespace-pre-wrap leading-relaxed text-xs md:text-sm font-serif">
                {selectedPost.body}
              </p>
            </div>

            {/* Reactions Bar */}
            <div className="flex items-center gap-2 pt-1">
              {['CONFIRM', 'SUSPICIOUS', 'ENLIGHTENING'].map(type => {
                const count = (selectedPost.reactions || []).filter((r) => r.type === type).length;
                const hasReacted = (selectedPost.reactions || []).some(
                  (r) => r.type === type && r.userId === user?.id
                );

                return (
                  <button
                    key={type}
                    onClick={() => handleToggleReaction(type)}
                    className={`px-2.5 py-1 rounded text-[11px] border flex items-center gap-1.5 transition ${
                      hasReacted
                        ? 'bg-gold/20 text-gold border-gold'
                        : 'bg-void/60 text-bone/70 border-bronze/40 hover:border-gold'
                    }`}
                  >
                    {type === 'CONFIRM' && <ThumbsUp size={12} />}
                    {type === 'SUSPICIOUS' && <AlertTriangle size={12} />}
                    {type === 'ENLIGHTENING' && <Lightbulb size={12} />}
                    <span>{type}</span>
                    <span className="font-bold">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Comments Thread */}
            <div className="pt-3 border-t border-bronze/40 space-y-2.5">
              <h4 className="text-gold font-display text-xs font-semibold uppercase tracking-wider">
                Council Annotations ({selectedPost.comments?.length || 0})
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {(selectedPost.comments || []).map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded bg-void/70 border border-bronze/30 space-y-0.5"
                  >
                    <div className="flex justify-between text-[10px] text-gold/80 font-display">
                      <span>{c.author?.profile?.codename || c.author?.username}</span>
                      <span className="text-bone/40">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-bone/85 text-[11px] leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <input
                  className="inp text-xs flex-1"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Inscribe a margin note or counter-evidence..."
                />
                <button
                  type="submit"
                  disabled={postingComment || !commentText.trim()}
                  className="btn flex items-center gap-1 text-xs shrink-0"
                >
                  <Send size={12} />
                  <span>Affix</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* Publish Intel Modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Inscribe Intelligence Report"
      >
        <form onSubmit={handleCreatePost} className="space-y-3 text-xs">
          <div>
            <label className="block text-bone/70 mb-1">Report Title</label>
            <input
              className="inp"
              required
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Secret Aurora Order ritual ingredients spotted in Trier"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-bone/70 mb-1">Category</label>
              <select
                className="inp"
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
              >
                <option value="GENERAL">General Occult</option>
                <option value="FORMULA">Potion Formula</option>
                <option value="CULT">Cult Activity</option>
                <option value="ARTIFACT">Sealed Artifact</option>
                <option value="HISTORY">Ancient History</option>
              </select>
            </div>

            <div>
              <label className="block text-bone/70 mb-1">Min Sequence Required</label>
              <input
                type="number"
                min={0}
                max={9}
                className="inp"
                value={formSeq}
                onChange={e => setFormSeq(+e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Tags (Comma-separated)</label>
            <input
              className="inp"
              value={formTags}
              onChange={e => setFormTags(e.target.value)}
              placeholder="e.g. Backlund, Sailor, Sequence 6, Storm Church"
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Report Content</label>
            <textarea
              className="inp h-36 font-serif text-xs leading-relaxed"
              required
              value={formBody}
              onChange={e => setFormBody(e.target.value)}
              placeholder="Inscribe the full intelligence details, coordinates, eye-witness testimonies, or alchemical proportions..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="btn text-bone/60 hover:text-bone"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn flex items-center gap-1.5"
            >
              <ScrollText size={13} />
              <span>{submitting ? 'Inscribing...' : 'Seal & Publish'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
