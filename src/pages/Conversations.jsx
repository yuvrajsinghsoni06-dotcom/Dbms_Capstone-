import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Send,
  Lock,
  User,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';

export default function Conversations() {
  const { user, socket } = useApp();
  const [threads, setThreads] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatScrollRef = useRef(null);

  // Load whisper threads
  const loadThreads = async () => {
    try {
      const [threadList, members] = await Promise.all([
        api.getWhisperThreads(),
        api.getMembers()
      ]);

      // If no threads yet, populate available members
      if (threadList.length === 0) {
        const others = members
          .filter((m) => m.id !== user?.id)
          .map((m) => ({
            partnerId: m.id,
            codename: m.codename,
            avatarCard: m.avatarCard,
            lastMessage: 'Tap to start a private conversation.',
            lastAt: null,
            unread: false
          }));
        setThreads(others);
        if (others.length > 0 && !activePartner) {
          setActivePartner(others[0]);
        }
      } else {
        setThreads(threadList);
        if (!activePartner && threadList.length > 0) {
          setActivePartner(threadList[0]);
        }
      }
    } catch (err) {
      toast.error('Failed to load conversations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [user]);

  // Load messages with active partner
  const loadMessages = async (partnerId) => {
    try {
      const msgs = await api.getWhispers(partnerId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load whispers:', err);
    }
  };

  useEffect(() => {
    if (activePartner) {
      loadMessages(activePartner.partnerId || activePartner.id);
    }
  }, [activePartner]);

  // Listen for real-time whispers
  useEffect(() => {
    const unsub = socket.on('WHISPER_RECEIVED', (payload) => {
      const currentPartnerId = activePartner?.partnerId || activePartner?.id;
      if (payload.fromId === currentPartnerId || payload.toId === currentPartnerId) {
        setMessages(prev => [...prev, payload]);
        setTimeout(() => {
          chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
      loadThreads();
    });

    return () => unsub();
  }, [socket, activePartner]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activePartner) return;
    const targetId = activePartner.partnerId || activePartner.id;
    setSending(true);
    try {
      const msg = await api.sendWhisper(targetId, inputMsg.trim());
      setMessages(prev => [...prev, msg]);
      setInputMsg('');
      loadThreads();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bronze/40 pb-2">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-gold" />
          <h1 className="text-xl md:text-2xl font-display text-gold font-bold">
            Secret Whispers & Invocations
          </h1>
        </div>
        <span className="text-xs text-bone/60">
          Encrypted by the Fog of Sefirah Castle
        </span>
      </div>

      {/* Main Two-Pane Chat Container */}
      <div className="panel p-0 flex-1 flex flex-col md:flex-row overflow-hidden border-bronze/60">
        {/* Thread List Sidebar */}
        <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-bronze/40 flex flex-col bg-void/70">
          <div className="p-3 border-b border-bronze/40 flex items-center justify-between">
            <span className="font-display text-xs text-gold font-semibold uppercase tracking-wider">
              Whisper Threads
            </span>
            <button
              onClick={loadThreads}
              className="text-bone/50 hover:text-gold"
              title="Refresh Threads"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-bronze/20 custom-scrollbar">
            {threads.map(t => {
              const partnerId = t.partnerId || t.id;
              const isActive = (activePartner?.partnerId || activePartner?.id) === partnerId;

              return (
                <div
                  key={partnerId}
                  onClick={() => setActivePartner(t)}
                  className={`p-3 cursor-pointer transition flex items-center gap-2.5 ${
                    isActive ? 'bg-gold/15 border-l-2 border-gold' : 'hover:bg-fog/50'
                  }`}
                >
                  <div className="w-9 h-9 rounded border border-gold/50 bg-bronze/30 flex items-center justify-center font-display text-gold text-xs shrink-0">
                    {t.avatarCard?.slice(0, 2) || t.codename.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs text-gold font-semibold truncate">
                        {t.codename}
                      </span>
                      {t.lastAt && (
                        <span className="text-[9px] text-bone/40">
                          {new Date(t.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-bone/60 truncate mt-0.5">
                      {t.lastMessage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 flex flex-col bg-fog/30">
          {activePartner ? (
            <>
              {/* Partner Header */}
              <div className="p-3 border-b border-bronze/40 bg-void/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded border border-gold/60 bg-bronze/30 flex items-center justify-center font-display text-gold text-xs">
                    {activePartner.avatarCard?.slice(0, 2) || activePartner.codename.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-display text-sm text-gold font-bold">
                      {activePartner.codename}
                    </h3>
                    <p className="text-[10px] text-bone/50">Private Spirit Channel</p>
                  </div>
                </div>

                <div className="text-[10px] text-bone/40 italic flex items-center gap-1">
                  <Lock size={11} className="text-gold" />
                  <span>Only visible to you and {activePartner.codename}</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div
                ref={chatScrollRef}
                className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar"
              >
                {messages.length === 0 ? (
                  <div className="h-full grid place-items-center text-xs text-bone/40 italic">
                    The space between you is silent. Whisper the first thought into the gray fog.
                  </div>
                ) : (
                  messages.map(m => {
                    const isFromMe = m.fromId === user?.id;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] p-2.5 rounded text-xs leading-relaxed ${
                            isFromMe
                              ? 'bg-gradient-to-r from-crimson/60 to-bronze/70 text-bone border border-gold/40'
                              : 'bg-void/80 text-bone border border-bronze/40'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                        </div>
                        <span className="text-[9px] text-bone/40 mt-1 px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-bronze/40 bg-void/50 flex gap-2">
                <input
                  className="inp text-xs flex-1"
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  placeholder={`Whisper to ${activePartner.codename}...`}
                />
                <button
                  type="submit"
                  disabled={sending || !inputMsg.trim()}
                  className="btn flex items-center gap-1 px-4 text-xs"
                >
                  <Send size={13} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-xs text-bone/50 italic">
              Select a member thread on the left to begin a secret whisper.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
