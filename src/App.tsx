import React, { useState, useEffect, useRef } from 'react';
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

import { CosmicBackground } from './components/CosmicBackground';
import { NavigationPanel } from './components/NavigationPanel';
import { TopHeader } from './components/TopHeader';
import { ConversationWorkspace } from './components/ConversationWorkspace';
import { MessageComposer } from './components/MessageComposer';
import { SettingsModal } from './components/SettingsModal';
import { UserProfileModal } from './components/UserProfileModal';

const DEFAULT_SETTINGS: PMLSettings = {
  theme: 'dark',
  particleDensity: 'medium',
  soundEffects: true,
  streamSpeed: 18,
  apiEndpoint: 'http://localhost:8000',
  autoReadAloud: false,
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

export const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [coreState, setCoreState] = useState<PMLCoreState>('idle');
  const [navOpen, setNavOpen] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);

  const [settings, setSettings] = useState<PMLSettings>(() => {
    const saved = localStorage.getItem('pml_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const abortControllerRef = useRef<boolean>(false);

  // Load conversations from local storage on mount
  useEffect(() => {
    pmlApi.fetchConversations().then(data => {
      setConversations(data);
    });
  }, []);

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

  // Toggle star conversation
  const handleToggleStarConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    cosmicAudio.playClickSound(settings.soundEffects);
    const updated = conversations.map(c => 
      c.id === id ? { ...c, isStarred: !c.isStarred } : c
    );
    saveConversationsState(updated);
  };

  // Rename active conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    const updated = conversations.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    );
    saveConversationsState(updated);
    await pmlApi.renameConversation(id, newTitle);
  };

  // Send message flow
  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (isStreaming) return;
    cosmicAudio.playSendSound(settings.soundEffects);

    let targetConvId = activeConversationId;
    let updatedConvs = [...conversations];

    // Create user message
    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachments,
    };

    // If no active conversation, create one
    if (!targetConvId) {
      const title = text.slice(0, 32) + (text.length > 32 ? '...' : '');
      const newConv: Conversation = {
        id: `conv_${Date.now()}`,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [userMsg],
      };
      targetConvId = newConv.id;
      updatedConvs = [newConv, ...updatedConvs];
      setActiveConversationId(targetConvId);
    } else {
      updatedConvs = updatedConvs.map(c => {
        if (c.id === targetConvId) {
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, userMsg],
          };
        }
        return c;
      });
    }

    saveConversationsState(updatedConvs);

    // Prepare PML response message item
    const pmlMsgId = Math.random().toString(36).substring(2, 9);
    const initialPmlMsg: Message = {
      id: pmlMsgId,
      role: 'pml',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    // Add empty streaming PML message
    updatedConvs = updatedConvs.map(c => {
      if (c.id === targetConvId) {
        return { ...c, messages: [...c.messages, initialPmlMsg] };
      }
      return c;
    });
    saveConversationsState(updatedConvs);

    setCoreState('thinking');
    setIsStreaming(true);
    abortControllerRef.current = false;

    // Extract historical messages context for multi-turn memory
    const activeConvObj = updatedConvs.find(c => c.id === targetConvId);
    const historyPayload = activeConvObj
      ? activeConvObj.messages
          .filter(m => m.id !== pmlMsgId && m.id !== userMsg.id && m.content)
          .map(m => ({
            role: (m.role === 'pml' ? 'assistant' : 'user') as 'assistant' | 'user',
            content: m.content,
          }))
      : [];

    // Stream PML response from API service
    try {
      await pmlApi.sendMessageStream(
        text,
        attachments,
        targetConvId,
        settings,
        {
          onChunk: (_chunk, fullText) => {
            if (abortControllerRef.current) return;
            setCoreState('responding');
            setConversations(prev =>
              prev.map(c => {
                if (c.id === targetConvId) {
                  return {
                    ...c,
                    messages: c.messages.map(m =>
                      m.id === pmlMsgId ? { ...m, content: fullText } : m
                    ),
                  };
                }
                return c;
              })
            );
          },
          onComplete: fullText => {
            setIsStreaming(false);
            setCoreState('idle');
            cosmicAudio.playReceiveSound(settings.soundEffects);

            setConversations(prev => {
              const final = prev.map(c => {
                if (c.id === targetConvId) {
                  return {
                    ...c,
                    messages: c.messages.map(m =>
                      m.id === pmlMsgId
                        ? { ...m, content: fullText, isStreaming: false }
                        : m
                    ),
                  };
                }
                return c;
              });
              pmlApi.saveConversations(final);
              return final;
            });

            // Update user profile query counts
            setUserProfile(prev => ({
              ...prev,
              queriesCount: prev.queriesCount + 1,
              docsAnalyzedCount: attachments.length > 0 ? prev.docsAnalyzedCount + attachments.length : prev.docsAnalyzedCount,
            }));
          },
          onError: () => {
            setIsStreaming(false);
            setCoreState('idle');
            setConversations(prev => {
              const final = prev.map(c => {
                if (c.id === targetConvId) {
                  return {
                    ...c,
                    messages: c.messages.map(m =>
                      m.id === pmlMsgId
                        ? {
                            ...m,
                            content: 'Unable to connect to PML. Please try again.',
                            isStreaming: false,
                            error: true,
                          }
                        : m
                    ),
                  };
                }
                return c;
              });
              pmlApi.saveConversations(final);
              return final;
            });
          },
        },
        historyPayload
      );
    } catch {
      setIsStreaming(false);
      setCoreState('idle');
    }
  };

  // Stop current streaming generation
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
        onOpenProfile={() => setProfileModalOpen(true)}
        userProfile={userProfile}
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
        />

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
      />

      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profile={userProfile}
      />
    </div>
  );
};

export default App;
