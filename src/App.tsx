import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { 
  Conversation, 
  Message, 
  PMLCoreState, 
  PMLSettings, 
  UserProfile, 
  QuickAction, 
  Attachment 
} from './types/pml';
import { pmlApi } from './services/pmlApi';
import { cosmicAudio } from './utils/audioSynth';
import { AuthProvider, useAuth } from './context/AuthContext';

import { CosmicBackground } from './components/CosmicBackground';
import { NavigationPanel } from './components/NavigationPanel';
import { TopHeader } from './components/TopHeader';
import { ConversationWorkspace } from './components/ConversationWorkspace';
import { MessageComposer } from './components/MessageComposer';
import { SettingsModal } from './components/SettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MemoryManagementModal } from './components/MemoryManagementModal';
import { AuthExperience } from './components/AuthExperience';
import { PMLCore } from './components/PMLCore';

const DEFAULT_SETTINGS: PMLSettings = {
  theme: 'dark',
  particleDensity: 'medium',
  soundEffects: true,
  streamSpeed: 18,
  apiEndpoint: 'http://localhost:8000',
  autoReadAloud: false,
  memoryEnabled: true,
};

const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Cosmic Explorer',
  email: 'explorer@pml.universe',
  role: 'Cosmic AI Researcher',
  queriesCount: 42,
  docsAnalyzedCount: 18,
  tier: 'Level 5 Intelligence Tier',
  joinedDate: 'August 2026',
};

const PMLAppContent: React.FC = () => {
  const { user, profile, signOut, loading } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [coreState, setCoreState] = useState<PMLCoreState>('idle');
  const [navOpen, setNavOpen] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [showGuestBanner, setShowGuestBanner] = useState<boolean>(true);

  const [settings, setSettings] = useState<PMLSettings>(() => {
    const saved = localStorage.getItem('pml_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const abortControllerRef = useRef<boolean>(false);

  // Dynamic user profile from authenticated session (Strict priority: profile.full_name -> user_metadata -> email -> fallback)
  const resolvedName = user
    ? (profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || (user.email ? user.email.split('@')[0] : 'Cosmic Explorer'))
    : 'Guest Explorer';

  const resolvedEmail = user
    ? (user.email || profile?.email || 'explorer@pml.universe')
    : 'Guest Session';

  const userProfile: UserProfile = {
    ...DEFAULT_USER_PROFILE,
    name: resolvedName,
    email: resolvedEmail,
    joinedDate: user?.created_at
      ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      : 'August 2026',
  };

  // Load conversations when user state initializes or changes
  useEffect(() => {
    if (user) {
      pmlApi.fetchConversations().then(data => {
        setConversations(data);
      });
    } else {
      setConversations([]);
      setActiveConversationId(null);
    }
  }, [user]);

  // Sync settings & theme attribute
  useEffect(() => {
    localStorage.setItem('pml_settings', JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings]);

  // Sync conversations to storage
  const saveConversationsState = (newConvs: Conversation[]) => {
    setConversations(newConvs);
    pmlApi.saveConversations(newConvs);
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Handle Logout
  const handleSignOut = async () => {
    await signOut();
    setConversations([]);
    setActiveConversationId(null);
    setProfileModalOpen(false);
    setMemoryModalOpen(false);
  };

  // Start new conversation
  const handleNewConversation = () => {
    cosmicAudio.playClickSound(settings.soundEffects);
    setActiveConversationId(null);
  };

  // Select conversation & load messages from backend database
  const handleSelectConversation = async (id: string) => {
    cosmicAudio.playClickSound(settings.soundEffects);
    setActiveConversationId(id);

    const convDetail = await pmlApi.fetchConversationDetails(id);
    if (convDetail && convDetail.messages) {
      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, messages: convDetail.messages } : c))
      );
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    cosmicAudio.playClickSound(settings.soundEffects);
    const updated = conversations.filter(c => c.id !== id);
    saveConversationsState(updated);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    await pmlApi.deleteConversation(id);
  };

  // Toggle star/bookmark on conversation
  const handleToggleStarConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    cosmicAudio.playClickSound(settings.soundEffects);
    const updated = conversations.map(c =>
      c.id === id ? { ...c, isStarred: !c.isStarred } : c
    );
    saveConversationsState(updated);
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    const updated = conversations.map(c =>
      c.id === id ? { ...c, title: newTitle } : c
    );
    saveConversationsState(updated);
    await pmlApi.renameConversation(id, newTitle);
  };

  // Send message flow (Streaming + DB persistence for guests & users + Long-Term Memory)
  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;

    abortControllerRef.current = false;
    cosmicAudio.playSendSound(settings.soundEffects);

    let currentConvId = activeConversationId;
    let updatedConversations = [...conversations];

    // Auto-create new conversation if currently in welcome screen
    if (!currentConvId) {
      const generatedTitle = text.slice(0, 32) + (text.length > 32 ? '...' : '');
      const newConv: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: generatedTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      updatedConversations = [newConv, ...updatedConversations];
      currentConvId = newConv.id;
      setActiveConversationId(currentConvId);
    }

    // 1. Append User Message
    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // 2. Prepare Assistant Message Placeholder
    const assistantMsgId = `msg_pml_${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'pml',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    // Update conversation state with user + blank assistant message
    const convIndex = updatedConversations.findIndex(c => c.id === currentConvId);
    if (convIndex !== -1) {
      updatedConversations[convIndex] = {
        ...updatedConversations[convIndex],
        updatedAt: new Date().toISOString(),
        messages: [...updatedConversations[convIndex].messages, userMsg, initialAssistantMsg],
      };
      saveConversationsState(updatedConversations);
    }

    // Set UI streaming and core animation state
    setIsStreaming(true);
    setCoreState('thinking');

    // Build context history
    const contextHistory = convIndex !== -1 
      ? updatedConversations[convIndex].messages.slice(0, -2).map(m => ({
          role: m.role === 'pml' ? 'assistant' : ('user' as 'user' | 'assistant'),
          content: m.content
        }))
      : [];

    let accumulatedContent = '';

    await pmlApi.sendMessageStream(
      text,
      attachments,
      currentConvId,
      settings,
      {
        onChunk: (_chunk, fullText) => {
          if (abortControllerRef.current) return;
          accumulatedContent = fullText;
          setCoreState('responding');

          setConversations(prev =>
            prev.map(c => {
              if (c.id === currentConvId) {
                return {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === assistantMsgId
                      ? { ...m, content: fullText, isStreaming: true }
                      : m
                  ),
                };
              }
              return c;
            })
          );
        },
        onComplete: fullText => {
          cosmicAudio.playReceiveSound(settings.soundEffects);
          setIsStreaming(false);
          setCoreState('idle');

          setConversations(prev => {
            const finalState = prev.map(c => {
              if (c.id === currentConvId) {
                return {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === assistantMsgId
                      ? { ...m, content: fullText, isStreaming: false }
                      : m
                  ),
                };
              }
              return c;
            });
            pmlApi.saveConversations(finalState);
            return finalState;
          });
        },
        onError: err => {
          console.error('[PML] Stream error:', err);
          setIsStreaming(false);
          setCoreState('idle');

          setConversations(prev =>
            prev.map(c => {
              if (c.id === currentConvId) {
                return {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content:
                            accumulatedContent ||
                            'Neural connection interrupted. Please verify backend is running on port 8000.',
                          isStreaming: false,
                        }
                      : m
                  ),
                };
              }
              return c;
            })
          );
        },
      },
      contextHistory
    );
  };

  // Stop Generation
  const handleStopGeneration = () => {
    abortControllerRef.current = true;
    setIsStreaming(false);
    setCoreState('idle');
  };

  // Regenerate last response
  const handleRegenerateResponse = () => {
    if (!activeConversation || activeConversation.messages.length < 2) return;
    const lastUserMsg = [...activeConversation.messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, lastUserMsg.attachments || []);
    }
  };

  // Select Quick Action Card on Welcome Screen
  const handleSelectQuickAction = (action: QuickAction) => {
    handleSendMessage(action.prompt);
  };

  // Register Feedback
  const handleFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
    pmlApi.sendFeedback(messageId, feedback);
  };

  // 1. Initial Checking Session Loading Animation (Prevents flashing guest before session resolves)
  if (loading) {
    return (
      <div className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-black">
        <CosmicBackground density={settings.particleDensity} theme={settings.theme} />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <PMLCore size="medium" state="thinking" />
          <p className="font-mono text-sm uppercase tracking-widest text-purple-300 font-semibold animate-pulse">
            Connecting to PML Universe...
          </p>
        </div>
      </div>
    );
  }

  // 2. Main Interface (Open to both Guests and Authenticated Users)
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col">
      {/* Dynamic Deep Space Canvas Background */}
      <CosmicBackground density={settings.particleDensity} theme={settings.theme} />

      {/* Floating Glass Navigation Drawer */}
      <NavigationPanel
        isOpen={navOpen}
        onToggle={() => setNavOpen(!navOpen)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onToggleStarConversation={handleToggleStarConversation}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenProfile={() => (user ? setProfileModalOpen(true) : setAuthModalOpen(true))}
        onOpenMemory={() => (user ? setMemoryModalOpen(true) : setAuthModalOpen(true))}
        userProfile={userProfile}
        isAuthenticated={Boolean(user)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace Layout Wrapper */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-300 w-full relative">
        {/* Top Toolbar Header */}
        <TopHeader
          navOpen={navOpen}
          onToggleNav={() => setNavOpen(!navOpen)}
          activeConversation={activeConversation}
          onRenameConversation={handleRenameConversation}
          coreState={coreState}
          theme={settings.theme}
          onToggleTheme={() =>
            setSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
          }
          onOpenSettings={() => setSettingsModalOpen(true)}
          onClearChat={handleNewConversation}
          onToggleStar={
            activeConversationId
              ? () => handleToggleStarConversation(activeConversationId, { stopPropagation: () => {} } as any)
              : undefined
          }
          isAuthenticated={Boolean(user)}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        {/* Guest Session Top Notice Pill (Subtle & Non-Intrusive, only shown for unauthenticated guests) */}
        {!user && showGuestBanner && (
          <div className="mx-auto mt-2 px-4 py-1.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.25)] z-20 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Guest Mode active. </span>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-white font-bold underline hover:text-purple-300 transition-colors cursor-pointer"
            >
              Sign in to sync & save chat history
            </button>
            <button
              onClick={() => setShowGuestBanner(false)}
              className="ml-1 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              title="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Central Workspace Stream */}
        <ConversationWorkspace
          activeConversation={activeConversation}
          coreState={coreState}
          onSelectQuickAction={handleSelectQuickAction}
          onRegenerateResponse={handleRegenerateResponse}
          onFeedback={handleFeedback}
          onSendMessage={handleSendMessage}
        />

        {/* Floating Message Console (only shown when conversation active with messages) */}
        {activeConversation && activeConversation.messages.length > 0 && (
          <MessageComposer
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            onStopGeneration={handleStopGeneration}
          />
        )}
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={newS => setSettings(prev => ({ ...prev, ...newS }))}
        onOpenMemory={() => (user ? setMemoryModalOpen(true) : setAuthModalOpen(true))}
      />

      {user && (
        <UserProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          profile={userProfile}
          onOpenMemory={() => setMemoryModalOpen(true)}
        />
      )}

      {/* Memory Management Console (Phase 6) */}
      <MemoryManagementModal
        isOpen={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
        settings={settings}
        onUpdateSettings={newS => setSettings(prev => ({ ...prev, ...newS }))}
        isAuthenticated={Boolean(user)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Auth Modal (Triggerable by user anytime or dismissible) */}
      {authModalOpen && (
        <AuthExperience onClose={() => setAuthModalOpen(false)} />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PMLAppContent />
    </AuthProvider>
  );
};

export default App;
