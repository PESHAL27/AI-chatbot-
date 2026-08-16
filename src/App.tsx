import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { 
  Conversation, 
  Message, 
  PMLCoreState, 
  PMLSettings, 
  UserProfile, 
  Attachment,
  DocumentItem
} from './types/pml';
import { pmlApi } from './services/pmlApi';
import { cosmicAudio } from './utils/audioSynth';
import { voiceService } from './services/voiceService';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/PMLToast';

import { CosmicBackground } from './components/CosmicBackground';
import { NavigationPanel } from './components/NavigationPanel';
import { TopHeader } from './components/TopHeader';
import { ConversationWorkspace } from './components/ConversationWorkspace';
import { MessageComposer } from './components/MessageComposer';
import { SettingsModal } from './components/SettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MemoryManagementModal } from './components/MemoryManagementModal';
import { DocumentLibraryModal } from './components/DocumentLibraryModal';
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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return localStorage.getItem('pml_active_conv_id') || null;
  });
  const [coreState, setCoreState] = useState<PMLCoreState>('idle');
  const [navOpen, setNavOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('pml_sidebar_open');
    if (saved !== null) return saved === 'true';
    return window.innerWidth >= 1024;
  });
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const handleToggleNav = () => {
    setNavOpen(prev => {
      const next = !prev;
      localStorage.setItem('pml_sidebar_open', String(next));
      return next;
    });
  };

  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState<boolean>(false);
  const [documentModalOpen, setDocumentModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [showGuestBanner, setShowGuestBanner] = useState<boolean>(true);

  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

  const [settings, setSettings] = useState<PMLSettings>(() => {
    const saved = localStorage.getItem('pml_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const abortControllerRef = useRef<boolean>(false);
  const lastLoadedUserIdRef = useRef<string | null | undefined>(undefined);

  // Dynamic user profile from authenticated session
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

  // Helper to safely select and persist active conversation ID
  const selectConversationId = (id: string | null) => {
    setActiveConversationId(id);
    if (id) {
      localStorage.setItem('pml_active_conv_id', id);
    } else {
      localStorage.removeItem('pml_active_conv_id');
    }
  };

  // Load conversations when user state initializes or changes (login/logout transition)
  useEffect(() => {
    const currentUserId = user?.id || 'guest';
    
    // Only re-fetch if this is an actual user change/login/logout event
    if (lastLoadedUserIdRef.current === currentUserId) {
      return;
    }
    lastLoadedUserIdRef.current = currentUserId;

    pmlApi.fetchConversations().then(async data => {
      setConversations(data);
      if (data.length > 0) {
        // Retain current active conversation if valid, otherwise pick the first
        const currentSavedId = localStorage.getItem('pml_active_conv_id');
        const targetId = (currentSavedId && data.some(c => c.id === currentSavedId))
          ? currentSavedId
          : data[0].id;

        selectConversationId(targetId);
        const fullDetails = await pmlApi.fetchConversationDetails(targetId);
        if (fullDetails) {
          setConversations(prev => prev.map(c => (c.id === targetId ? fullDetails : c)));
        }
      } else {
        selectConversationId(null);
      }
    });
  }, [user]);

  // Sync settings & theme attribute
  useEffect(() => {
    localStorage.setItem('pml_settings', JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
    if (settings.theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
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
    lastLoadedUserIdRef.current = undefined;
    setConversations([]);
    selectConversationId(null);
    setProfileModalOpen(false);
    setMemoryModalOpen(false);
    setDocumentModalOpen(false);
    setSelectedDocument(null);
  };

  // Start New Conversation
  const handleNewConversation = async () => {
    cosmicAudio.playInitiateSound(settings.soundEffects);
    const newConv = await pmlApi.createConversation('PML AI');
    const updated = [newConv, ...conversations];
    saveConversationsState(updated);
    selectConversationId(newConv.id);
  };

  // Select Existing Conversation
  const handleSelectConversation = async (id: string) => {
    cosmicAudio.playNodeSound(settings.soundEffects);
    selectConversationId(id);

    const currentConv = conversations.find(c => c.id === id);
    if (!currentConv || currentConv.messages.length === 0) {
      const fullDetails = await pmlApi.fetchConversationDetails(id);
      if (fullDetails) {
        setConversations(prev => prev.map(c => (c.id === id ? fullDetails : c)));
      }
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await pmlApi.deleteConversation(id);
    const updated = conversations.filter(c => c.id !== id);
    saveConversationsState(updated);
    if (activeConversationId === id) {
      selectConversationId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Toggle Star / Pin Status
  const handleToggleStarConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.map(c => (c.id === id ? { ...c, isStarred: !c.isStarred } : c));
    saveConversationsState(updated);
  };

  // Rename Conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    await pmlApi.renameConversation(id, newTitle);
    const updated = conversations.map(c => (c.id === id ? { ...c, title: newTitle } : c));
    saveConversationsState(updated);
  };

  // Direct Document Upload Handler from Composer / Drag & Drop
  const handleUploadDocument = async (file: File) => {
    try {
      const doc = await pmlApi.uploadDocument(file);
      setSelectedDocument(doc);
      // Open library to show ingestion status if desired
    } catch (err: any) {
      alert(`Document upload error: ${err.message || err}`);
    }
  };

  // Send User Message
  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;

    abortControllerRef.current = false;
    cosmicAudio.playSendSound(settings.soundEffects);

    let currentConvId = activeConversationId;
    let updatedConversations = [...conversations];

    // Create new conversation if none exists
    if (!currentConvId || !conversations.some(c => c.id === currentConvId)) {
      const firstTitle = text.slice(0, 32) + (text.length > 32 ? '...' : '');
      const createdConv = await pmlApi.createConversation(firstTitle || 'New Conversation');
      currentConvId = createdConv.id;
      updatedConversations = [createdConv, ...conversations];
      selectConversationId(currentConvId);
    }

    // 1. Prepare User Message
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

    const convId: string = currentConvId || `pml-conv-${Date.now()}`;

    await pmlApi.sendMessageStream(
      text,
      attachments,
      convId,
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
        onComplete: (fullText, metadata) => {
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
                      ? {
                          ...m,
                          content: fullText,
                          isStreaming: false,
                          memoriesUsed: metadata?.memoriesUsed,
                          sources: metadata?.sources,
                          webSources: metadata?.webSources,
                          toolsCalled: metadata?.toolsCalled
                        }
                      : m
                  ),
                };
              }
              return c;
            });
            pmlApi.saveConversations(finalState);

            // Auto-Read Aloud Response if enabled
            if (settings.autoReadAloud && accumulatedContent) {
              voiceService.speak(accumulatedContent, assistantMsgId, {
                lang: settings.speechLanguage || 'en-US'
              });
            }

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
      contextHistory,
      selectedDocument?.id
    );
  };

  // Stop Generation
  const handleStopGeneration = () => {
    abortControllerRef.current = true;
    voiceService.stopSpeaking();
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

  // Register Feedback
  const handleFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
    pmlApi.sendFeedback(messageId, feedback);
  };

  // Initial Checking Session Loading Animation
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#070510] flex flex-col items-center justify-center text-white z-50">
        <PMLCore size="large" state="thinking" />
        <p className="mt-4 font-mono text-xs text-purple-300 tracking-widest uppercase animate-pulse">
          Synchronizing PML Space State...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent text-white font-sans select-none relative">
      {/* Dynamic Cosmic Background */}
      <CosmicBackground density={settings.particleDensity} theme={settings.theme} />

      {/* Floating Glass Navigation Drawer */}
      <NavigationPanel
        isOpen={navOpen}
        onToggle={handleToggleNav}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onToggleStarConversation={handleToggleStarConversation}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenProfile={() => (user ? setProfileModalOpen(true) : setAuthModalOpen(true))}
        onOpenMemory={() => (user ? setMemoryModalOpen(true) : setAuthModalOpen(true))}
        onOpenDocuments={() => setDocumentModalOpen(true)}
        userProfile={userProfile}
        isAuthenticated={Boolean(user)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace Layout Wrapper */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden w-full relative">
        {/* Top Toolbar Header */}
        <TopHeader
          navOpen={navOpen}
          onToggleNav={handleToggleNav}
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
          selectedDocument={selectedDocument}
          onClearDocumentScope={() => setSelectedDocument(null)}
        />

        {/* Guest Session Top Notice Pill */}
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
          onRegenerateResponse={handleRegenerateResponse}
          onFeedback={handleFeedback}
          onSendMessage={handleSendMessage}
          selectedDocument={selectedDocument}
          onClearDocumentScope={() => setSelectedDocument(null)}
          onOpenDocumentLibrary={() => setDocumentModalOpen(true)}
          onUploadDocument={handleUploadDocument}
          speechLanguage={settings.speechLanguage || 'en-US'}
          isStreaming={isStreaming}
          onStopGeneration={handleStopGeneration}
        />

        {/* Pinned Bottom Message Console (when actively chatting in a thread) */}
        {activeConversation && activeConversation.messages.length > 0 && (
          <MessageComposer
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            onStopGeneration={handleStopGeneration}
            selectedDocument={selectedDocument}
            onClearDocumentScope={() => setSelectedDocument(null)}
            onOpenDocumentLibrary={() => setDocumentModalOpen(true)}
            onUploadDocument={handleUploadDocument}
            speechLanguage={settings.speechLanguage || 'en-US'}
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

      {/* Document Intelligence & RAG Library (Phase 7) */}
      <DocumentLibraryModal
        isOpen={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        selectedDocumentId={selectedDocument?.id || null}
        onSelectDocument={doc => setSelectedDocument(doc)}
        onUploadSuccess={doc => setSelectedDocument(doc)}
      />

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthExperience onClose={() => setAuthModalOpen(false)} />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <PMLAppContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
