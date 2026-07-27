import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  GraduationCap,
  BookOpen,
  Users,
  FileText,
  Home,
  BarChart3,
  AlertCircle,
  ChevronDown,
  ShieldCheck,
  History,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { ChatMessage, type FeedbackSubmission } from "./components/ChatMessage";
import { QuickActionButton } from "./components/QuickActionButton";
import { CategoryCard } from "./components/CategoryCard";
import { TypingIndicator } from "./components/TypingIndicator";
import { ChatSidebar } from "./components/ChatSidebar";
import { ConversationHistory } from "./components/ConversationHistory";
import { LandingPage } from "./components/LandingPage";
import { warmSeviStickers } from "./components/SeviSticker";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { api, type ChatResponse } from "@/lib/api";
import { loadCoords } from "@/lib/coordsStore";
import { loadWaypoints } from "@/lib/waypointsStore";
import { useConsent } from "@/lib/hooks/useConsent";
import {
  getUserId,
  getSessionId,
  getDeviceId,
  getConversationId,
  newConversationId,
  setConversationId,
} from "@/lib/ids";
import { isHistoryEnabled, loadConversation } from "@/lib/historyStore";
import { useConversationHistory } from "@/lib/hooks/useConversationHistory";
import { timeNow } from "@/lib/time";
import { pickIcon } from "@/lib/iconMap";
import { useChat, type UseChatApi } from "@/lib/hooks/useChat";
import { useSmartScroll } from "@/lib/hooks/useSmartScroll";
import { useVisualViewportHeight } from "@/lib/hooks/useViewport";
import { useApiHealth } from "@/lib/hooks/useApiHealth";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  type TopicCard,
  buildTopicCards,
  getDefaultTopicCards,
  getTopicCard,
  rankRelevantTopicCards,
} from "@/lib/topicCatalog";

// Embed mode — when Sevi is iframed (e.g. via the widget on cvsu.edu.ph),
// hide the green header, footer line, and the outer shadow/rounded corners so
// the host's iframe owns the visual frame. Enable via ?embed=1 query string.
const IS_EMBED =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("embed") === "1";

// Fullscreen chat — a directly navigable entry to the same chat the widget
// iframes, for desktop/tablet users who want it full-window: /chat under the
// app base (nginx SPA fallback), or ?chat=1 anywhere (static hosts without a
// fallback, e.g. GitHub Pages). Unlike ?embed=1 nothing is chrome-stripped,
// so at lg widths the sidebar + header show like a real app.
const APP_BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
const IS_CHAT_PAGE =
  typeof window !== "undefined" &&
  (new URLSearchParams(window.location.search).get("chat") === "1" ||
    window.location.pathname === `${APP_BASE}chat` ||
    window.location.pathname === `${APP_BASE}chat/`);

// The admin panel is a SEPARATE app (admin.html → app/admin/main.tsx): this
// bundle carries no admin code, state, or PIN handling. Both entry points
// below — the Ctrl/Cmd+Shift+A shortcut and the legacy ?admin=1 link — simply
// navigate here, where the PIN gate lives.
const adminUrl = () => `${APP_BASE}admin/`;

const PRIVACY_POLICY_URL =
  "https://cvsu.edu.ph/office-of-the-data-protection-officer/general-data-privacy-notice/";

const WELCOME_TEXT =
  "Hi! I'm Sevi, the official chatbot of Cavite State University. I'm here to help you with admissions, enrollment, courses, scholarships, campus facilities, and more. What can I help you with today?";

// Consent disclosure — the specific processing this assistant does, per the
// Data Privacy Act (RA 10173) and docs/privacy_compliance.md §3.2. Copy is
// pending final CvSU Data Protection Officer sign-off; the linked notice is
// authoritative.
const CONSENT_PROMPT_TEXT =
  `Hello and welcome to Cavite State University! I'm Sevi — the CvSU Virtual Assistant. ` +
  `Before we begin: your messages are logged to improve this service, automatically screened for safety, ` +
  `and may be used to make Sevi's answers better. For live records (documents, tickets, accounts) I look ` +
  `them up from the relevant CvSU system under your own access — I never ask for passwords in chat. ` +
  `Our chats are not kept on this device unless you switch on **Saved chats** yourself; if you do, ` +
  `they stay in this browser only and you can delete them at any time. ` +
  `Full details are in our [Data Privacy Notice](${PRIVACY_POLICY_URL}). ` +
  `If you agree, kindly click the **I Agree** button below.`;

const FOLLOWUP_LOW_CONFIDENCE =
  "I may have missed your question. Try one of these related topics, or rephrase your question with a little more detail.";

// Phase 2A Wave 2 — write tools gated behind an env flag so the
// UI surface only appears when the operator has enabled the pilot.
// Read once at module load: changing the flag requires a Vite restart,
// which matches the "kill switch needs a redeploy" expectation.
const AIS_WRITE_ENABLED =
  ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_AIS_WRITE_ENABLED ?? "0") === "1";

export default function App() {
  const userId = useMemo(() => getUserId(), []);
  const sessionId = useMemo(() => getSessionId(), []);
  // Stable per-device id, kept apart from userId so device-usage counts survive
  // a user-id reset (and vice versa). See getDeviceId() in lib/ids.ts.
  const deviceId = useMemo(() => getDeviceId(), []);
  // Which saved conversation is on screen. Separate from sessionId on purpose —
  // that one is a bearer capability for the AIS token (see lib/ids.ts), so it
  // is not something to write into localStorage as an archive key.
  const [conversationId, setActiveConversation] = useState(() => getConversationId());
  // Read once, synchronously, before first paint: localStorage is a sync API,
  // so a restored conversation renders in the first frame instead of flashing
  // an empty chat. Reopening a *different* conversation later goes through
  // chat.replaceMessages, which is why this deliberately has no deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const restoredMessages = useMemo(
    () => (isHistoryEnabled() ? loadConversation(deviceId, conversationId) : []),
    [],
  );
  // Single source of truth for AIS auth state across all chat bubbles.
  // useAuth runs whoami on mount so a page refresh in the middle of an
  // active session restores the logged-in identity without a new login.
  const ais = useAuth(sessionId);

  const consent = useConsent();
  const apiHealth = useApiHealth();
  const [inputValue, setInputValue] = useState("");
  // The topic cards are a starting point, so they stay hidden when the student
  // has come back to a conversation already in progress.
  const [showCategories, setShowCategories] = useState(restoredMessages.length === 0);
  // Below lg the sidebar is not rendered at all, so the saved-chats surface
  // becomes an overlay reached from the quick-actions strip.
  const [showHistory, setShowHistory] = useState(false);
  // The old `?admin=1` deep link now forwards to the standalone admin app so
  // existing bookmarks keep working.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("admin") === "1") {
      window.location.replace(adminUrl());
    }
  }, []);

  const [availableIntentTags, setAvailableIntentTags] = useState<string[]>([]);
  const [categoriesHeading, setCategoriesHeading] = useState("Common questions");
  const [categories, setCategories] = useState<TopicCard[]>(() => getDefaultTopicCards());
  const inputRef = useRef<HTMLInputElement>(null);

  const scroll = useSmartScroll();
  const reducedMotion = usePrefersReducedMotion();
  // Publishes --sevi-vh so the shell below can size to the space the on-screen
  // keyboard leaves behind (see the shell's h-[var(--sevi-vh,100dvh)]).
  useVisualViewportHeight();

  // useCallback so chat.sendMessage keeps a stable identity — it is passed to
  // every memoized ChatMessage as onSuggestion, and an inline arrow here would
  // change sendMessage's identity on every render and defeat that memo.
  const chatRef = useRef<UseChatApi | null>(null);
  const handleBotResponse = useCallback(
    (res: ChatResponse, userInput: string) => {
      // Only apologize on a genuine miss — the static canned fallback
      // (source === "fallback"). When the local/Claude LLM actually answered
      // (still tagged intent nlu_fallback, but source llm_local/llm_claude),
      // the reply is real, so don't append "I may have missed your question".
      if (res.source !== "fallback") return;
      chatRef.current?.pushMessage({
        text: FOLLOWUP_LOW_CONFIDENCE,
        isBot: true,
        followUp: true,
      });
      setCategoriesHeading("Try one of these topics");
      setCategories(rankRelevantTopicCards(userInput, res.intent, availableIntentTags));
      setShowCategories(true);
    },
    [availableIntentTags],
  );

  const chat = useChat({
    userId,
    sessionId,
    deviceId,
    initialMessages: restoredMessages,
    onBotResponse: handleBotResponse,
  });
  // The callback above runs after `chat` exists but is defined before it, so it
  // reaches pushMessage through this rather than closing over it.
  chatRef.current = chat;

  // On-device transcript archive. Off unless the student switches it on, and
  // never written before privacy consent — see lib/historyStore.ts for why the
  // default is off on shared campus machines.
  const history = useConversationHistory({
    deviceId,
    conversationId,
    messages: chat.messages,
    canPersist: consent.consented,
  });

  // Warm the chat-critical stickers shortly after mount so the typing
  // indicator or a mood swap never starts a ~700KB GIF download in the middle
  // of the user's wait. Chat surfaces only — the landing page must not pay
  // for chat assets. The delay keeps it off the initial-paint network burst.
  useEffect(() => {
    if (!IS_EMBED && !IS_CHAT_PAGE) return;
    const t = window.setTimeout(
      () => warmSeviStickers(["listening", "excited", "thinking", "confused"], reducedMotion),
      1500,
    );
    return () => window.clearTimeout(t);
  }, [reducedMotion]);

  // Auto-scroll only when a NEW message is appended — not on every parent
  // re-render. Keying on the last message id avoids re-firing on keystrokes
  // (inputValue), scroll-state flips, etc., which on mobile manifested as
  // a stuck/fighting smooth-scroll.
  const lastMessage = chat.messages[chat.messages.length - 1];
  const lastId = lastMessage?.id;
  const lastFromUser = lastMessage ? !lastMessage.isBot : false;
  useEffect(() => {
    if (lastId === undefined) return;
    scroll.notifyNewMessage(lastFromUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  useEffect(() => {
    if (!chat.isTyping) inputRef.current?.focus();
  }, [chat.isTyping]);

  useEffect(() => {
    void loadCoords();
    void loadWaypoints();
  }, []);

  // Admin entry point. The embed header is deliberately hidden (the host
  // page on cvsu.edu.ph owns the frame), so there is intentionally no
  // visible admin button in the chat UI; Ctrl/Cmd+Shift+A opens it instead.
  // (The pre-rebrand build had a header button wired to this same handler —
  // the landing-page rework dropped it; this restores an entry point without
  // adding UI surface to the public widget.)
  // It now NAVIGATES to the separate admin app rather than mounting a panel:
  // this bundle carries no admin code, and the PIN gate lives over there.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        window.location.href = adminUrl();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .getIntents()
      .then((data) => {
        const list: any[] = Array.isArray(data) ? data : data?.intents ?? [];
        if (list.length === 0) return;
        const tags = list
          .map((item: any) => (typeof item === "string" ? item : item.tag ?? item.name))
          .filter(Boolean);
        setAvailableIntentTags(tags);
        setCategories(getDefaultTopicCards(tags));
      })
      .catch(() => {});
  }, []);

  // Seasonal homepage cards — the backend ranks topics for the current
  // month (e.g. enrollment cards in Aug/Jan, CvSUCAT cards in Apr/May).
  // Falls back to the static default if the call fails.
  useEffect(() => {
    let cancelled = false;
    api
      .getRecommendedTopics()
      .then((data) => {
        if (cancelled || !data?.tags?.length) return;
        setCategoriesHeading(data.label || "Common questions");
        setCategories(buildTopicCards(data.tags));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const resetCategories = () => {
    setCategoriesHeading("Common questions");
    setCategories(getDefaultTopicCards(availableIntentTags));
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || chat.isTyping) return;
    chat.pushMessage({ text, isBot: false });
    setInputValue("");
    setShowCategories(false);
    void chat.sendMessage(text);
  };

  const handleQuickAction = (topic: TopicCard) => {
    if (chat.isTyping) return;
    setShowCategories(false);
    chat.pushMessage({ text: topic.prompt, isBot: false });
    void chat.sendMessage(topic.prompt);
  };

  // One stable callback shared by every bubble — ChatMessage hands back the
  // intent and message id it already holds, so this needs no per-message
  // closure and the memo on ChatMessage keeps holding.
  const handleFeedback = useCallback(
    async (
      submission: FeedbackSubmission,
      intent: string | undefined,
      messageId: number | undefined,
    ) => {
      try {
        await api.submitFeedback({
          message_id: messageId,
          user_id: userId,
          session_id: sessionId,
          intent,
          helpful: submission.helpful,
          rating: submission.helpful ? 5 : 2,
          reason: submission.reason,
          comment: submission.comment,
        });
      } catch {
        /* ignore feedback errors silently */
      }
    },
    [userId, sessionId],
  );

  // A new conversation, not a new session: rotating the session id would drop
  // the AIS login it keys, which is a sign-out, not a fresh chat. The old
  // transcript keeps its own id and stays in the history rail.
  const handleStartOver = () => {
    setActiveConversation(newConversationId());
    chat.resetMessages();
    setShowCategories(true);
    setInputValue("");
    resetCategories();
    scroll.scrollToBottom(true);
  };

  const handleOpenConversation = (id: string) => {
    const restored = history.restore(id);
    setConversationId(id);
    setActiveConversation(id);
    chat.replaceMessages(restored);
    setShowCategories(restored.length === 0);
    setInputValue("");
    resetCategories();
    scroll.scrollToBottom(true);
  };

  // Clearing the conversation on screen has to clear the screen too, otherwise
  // "delete" leaves the transcript visibly sitting there.
  const handleDeleteConversation = (id: string) => {
    history.remove(id);
    if (id === conversationId) handleStartOver();
  };

  const handleClearHistory = () => {
    history.clearAll();
    handleStartOver();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const awaitingConsent = consent.hydrated && !consent.consented;
  const initialBotText = consent.consented ? WELCOME_TEXT : CONSENT_PROMPT_TEXT;
  const initialBotTimestamp = useMemo(() => timeNow(), []);
  const sendDisabled = awaitingConsent || chat.isTyping || !inputValue.trim();

  let inputPlaceholder = "Message Sevi…";
  if (awaitingConsent) {
    inputPlaceholder = "Please agree to the Data Privacy Notice to continue…";
  } else if (chat.isTyping) {
    inputPlaceholder = "Sevi is replying…";
  } else if (apiHealth === "offline") {
    inputPlaceholder = "Can't connect right now — you can still try sending…";
  }

  const handleAcceptConsent = () => {
    consent.accept();
    setShowCategories(true);
    inputRef.current?.focus();
  };

  // Outside of the iframed embed and the fullscreen /chat route, render the
  // marketing landing page instead of the full chat. The widget script (loaded
  // from index.html) supplies the chat itself via a launcher bubble that opens
  // an iframe of ?embed=1.
  if (!IS_EMBED && !IS_CHAT_PAGE) {
    return <LandingPage />;
  }

  return (
    // --sevi-vh is the visual-viewport height published by
    // useVisualViewportHeight(); it collapses when the on-screen keyboard
    // opens so the composer never ends up behind the keys. Falls back to
    // 100dvh wherever visualViewport is unavailable.
    <div className="min-h-[var(--sevi-vh,100dvh)] w-full bg-paper lg:bg-paper-sunken">
      <div className="relative mx-auto flex h-[var(--sevi-vh,100dvh)] w-full">
        {/* Desktop conversation rail — hidden until lg, so the ≤420px widget
            iframe keeps the single-column phone layout. */}
        <ChatSidebar
          className="hidden lg:flex"
          topics={categories}
          onStartOver={handleStartOver}
          onTopic={handleQuickAction}
          conversations={history.conversations}
          historyEnabled={history.enabled}
          onToggleHistory={history.setEnabled}
          onOpenConversation={handleOpenConversation}
          onDeleteConversation={handleDeleteConversation}
          onClearHistory={handleClearHistory}
        />
        {/* Main column. On tablet/desktop the conversation, quick actions, and
            composer center in a readable width instead of stretching edge-to-
            edge; on phone this is a no-op. */}
        <div className="relative flex h-[var(--sevi-vh,100dvh)] min-w-0 flex-1 flex-col overflow-hidden bg-paper">
          <div className="hidden items-center gap-3 border-b border-forest-900/10 px-8 py-4 lg:flex">
            <span className="text-sm font-semibold tracking-tight text-forest-900">
              CvSU Virtual Assistant
            </span>
            <span className="rounded-full border border-forest-900/10 bg-paper-raised px-3 py-1 text-[11px] font-medium text-ink-500">
              Indang main campus
            </span>
          </div>

        <AnimatePresence>
          {(chat.apiError || (apiHealth === "offline" && !awaitingConsent)) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2.5 border-b border-gold-200 bg-gold-50 px-5 py-3 text-xs text-gold-700 sm:items-center sm:px-8">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span className="min-w-0 flex-1">
                  {chat.apiError ??
                    "Sevi can't connect to CvSU right now — replies may not come through."}
                </span>
                {chat.apiError && (
                  <button
                    onClick={() => {
                      chat.setApiError(null);
                      chat.retryLast();
                    }}
                    className="flex-shrink-0 rounded-lg border border-gold-300 bg-paper-raised px-4 py-2 font-semibold text-gold-700 transition-colors hover:bg-gold-100"
                  >
                    Retry
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={scroll.containerRef}
          onScroll={scroll.onScroll}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-14 pt-6 [-webkit-overflow-scrolling:touch] sm:px-8 sm:pb-16 sm:pt-8 short:pb-12 short:pt-3"
        >
          <div className="mx-auto w-full md:max-w-2xl lg:max-w-3xl">
          <ChatMessage
            message={initialBotText}
            isBot={true}
            timestamp={initialBotTimestamp}
            isGrouped={false}
            // Greeting Sevi: attentive while asking for consent, excited once
            // the conversation can actually start.
            mood={awaitingConsent ? "listening" : "excited"}
          />

          {awaitingConsent && (
            <div className="mb-4 ml-10 sm:ml-11">
              <button
                onClick={handleAcceptConsent}
                className="inline-flex items-center gap-2 rounded-2xl bg-forest-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:text-base"
              >
                <ShieldCheck className="h-4 w-4" />
                I Agree
              </button>
            </div>
          )}

          {chat.messages.map((message, index) => {
            const prev = chat.messages[index - 1];
            const isGrouped = !!prev && prev.isBot === message.isBot;
            return (
              <ChatMessage
                key={message.id}
                message={message.text}
                isBot={message.isBot}
                timestamp={message.timestamp}
                isGrouped={isGrouped}
                messageId={message.messageId}
                onFeedback={handleFeedback}
                followUp={message.followUp}
                typing={message.id === chat.typingMessageId}
                onTypingDone={chat.clearTypingMessageId}
                cards={message.cards}
                context={message.context}
                suggestions={message.suggestions}
                displayHint={message.displayHint}
                source={message.source}
                refusalReason={message.refusalReason}
                onSuggestion={chat.sendMessage}
                intent={message.intent}
                // Phase 2A Wave 2 — write actions on DV card.
                writeEnabled={AIS_WRITE_ENABLED}
                sessionId={sessionId}
                ais={ais}
              />
            );
          })}

          {chat.isTyping && <TypingIndicator />}

          <AnimatePresence>
            {showCategories && !awaitingConsent && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-8 space-y-4"
              >
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-700">
                  {categoriesHeading}
                </p>
                {/* Bento, not a matrix: the first (highest-ranked) topic runs
                    the full width and the rest pair off beneath it, so the
                    grid has a focal point instead of six equal choices. Cards
                    spring in one after another — 45ms apart, which reads as a
                    single gesture rather than six separate animations. */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {categories.map((category, i) => (
                    <motion.div
                      key={category.tag}
                      className={i === 0 ? "sm:col-span-2" : ""}
                      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 240, damping: 26, delay: i * 0.045 }
                      }
                    >
                      <CategoryCard
                        icon={pickIcon(category.tag)}
                        title={category.title}
                        description={category.description}
                        onClick={() => handleQuickAction(category)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={scroll.endRef} className="h-2" />
          </div>
        </div>

        <AnimatePresence>
          {scroll.showScrollDown && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll.scrollToBottom(true)}
              className="absolute bottom-[140px] right-5 z-10 flex items-center gap-1.5 rounded-full border border-forest-900/10 bg-paper-raised/85 px-4 py-2 text-sm font-medium text-ink-700 shadow-float backdrop-blur-xl transition-colors hover:bg-forest-50 sm:bottom-[160px] sm:right-8 short:bottom-[104px]"
            >
              <ChevronDown className="h-4 w-4 text-ink-500" />
              {scroll.hasNewMessage && (
                <span className="flex items-center gap-1.5 text-xs text-forest-700">
                  {/* Gold reads as "something arrived" without competing with
                      the green the rest of the chrome is built from. */}
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                  New message
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* The dock: quick actions + composer.

            -mt-8 pulls it up over the scroll area's last 32px so the dock
            reads as sitting proud of the transcript rather than as a footer
            welded under a rule, while the scroll container's matching extra
            bottom padding keeps the last message clear of it. The bar itself
            is opaque: a translucent backdrop-blur band read as a rendering
            bug when a full card scrolled behind it on the narrow embed, so
            the glass was dropped in favour of a solid fill. The dock itself
            carries an opaque paper fill so the transcript is cleanly hidden
            where it passes under the -mt-8 overlap — earlier a paper gradient
            "fade" washed content here, which ghosted the map CTA/coachmark
            when they parked at the transcript bottom, so it was removed. */}
        <div className="relative -mt-8 flex-shrink-0 bg-paper">
        {!showCategories && (
          <div className="relative px-5 pb-1 pt-2 sm:px-8 short:pt-1">
            <div className="mx-auto flex w-full gap-2.5 overflow-x-auto scrollbar-none pb-1 md:max-w-2xl lg:max-w-3xl">
              <QuickActionButton icon={Home} label="Start Over" onClick={handleStartOver} />
              {/* Below lg there is no sidebar, so this is the only way to the
                  saved-chats switch. It appears once a conversation has
                  started, which is also the first moment there is anything to
                  save or decide about. */}
              <span className="contents lg:hidden">
                <QuickActionButton
                  icon={History}
                  label="Saved chats"
                  onClick={() => setShowHistory(true)}
                />
              </span>
              <QuickActionButton
                icon={FileText}
                label="Admissions"
                onClick={() => handleQuickAction(getTopicCard("admissions_requirements"))}
              />
              <QuickActionButton
                icon={BookOpen}
                label="Courses"
                onClick={() => handleQuickAction(getTopicCard("courses_offered"))}
              />
              <QuickActionButton
                icon={Users}
                label="Support"
                onClick={() => handleQuickAction(getTopicCard("contact_info"))}
              />
            </div>
          </div>
        )}

        {/* Composer — a command bar, not a footer pinned under a rule. It
            stays in the flex flow (so the scroll area's height math, the
            on-screen keyboard and `short:` all keep working); what makes it
            float is the dock's negative margin above, the hairline + diffused
            shadow, and its opaque fill standing clear of the transcript.

            On a short viewport (landscape phone, or any phone with the
            keyboard up) the vertical padding is the first thing to go — every
            row saved here is a row of conversation kept on screen. */}
        <div className="relative px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 sm:px-8 sm:pb-6 sm:pt-3 short:pt-1 short:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full md:max-w-2xl lg:max-w-3xl">
            {/* focus-within ring, not just a border swap: a 1px border change
                on a hairline is ~1.5:1 against the bar, which is no focus
                indicator at all for a keyboard user on the app's main
                control. */}
            <div className="flex items-center gap-2 rounded-[1.75rem] border border-forest-900/10 bg-paper-raised p-2 pl-5 shadow-float transition-colors focus-within:border-forest-600/40 focus-within:bg-paper-raised focus-within:ring-2 focus-within:ring-forest-600/35">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={awaitingConsent}
                placeholder={inputPlaceholder}
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] leading-tight text-ink-900 placeholder:text-ink-500 focus:outline-none disabled:cursor-not-allowed disabled:text-ink-400 sm:text-base short:py-1"
              />
              <button
                onClick={handleSend}
                disabled={sendDisabled}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 transition-colors hover:bg-forest-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:bg-forest-800 disabled:bg-ink-200 short:h-9 short:w-9"
                aria-label="Send message"
              >
                <Send className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </button>
            </div>
            {/* Always-visible accuracy disclosure — the in-reply disclaimer only
                shows on intents most users never trigger. Low emphasis on
                purpose: present on every turn, shouting on none. */}
            <p className="mt-3 text-center text-[11px] leading-tight text-ink-500 short:mt-1.5 short:text-[10px]">
              Sevi can make mistakes — verify important details with the official{" "}
              <a
                href="https://cvsu.edu.ph"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-ink-600"
              >
                CvSU website
              </a>{" "}
              or the office concerned.
            </p>
          </div>
        </div>
        {/* /dock */}
        </div>

        </div>

        {/* Saved-chats overlay — the below-lg counterpart to the sidebar rail.
            Hidden outright at lg so the two can never both be on screen. */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-20 flex flex-col bg-forest-950/25 backdrop-blur-[2px] lg:hidden"
            >
              <button
                type="button"
                aria-label="Close saved chats"
                className="flex-1"
                onClick={() => setShowHistory(false)}
              />
              <motion.div
                initial={{ y: reducedMotion ? 0 : "100%" }}
                animate={{ y: 0 }}
                exit={{ y: reducedMotion ? 0 : "100%" }}
                transition={{ duration: 0.2 }}
                className="max-h-[70%] overflow-y-auto rounded-t-3xl border-t border-forest-900/10 bg-paper/95 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-float backdrop-blur-xl"
              >
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-sm font-semibold tracking-tight text-forest-900">
                    Saved chats
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    aria-label="Close saved chats"
                    className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-forest-50 hover:text-forest-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ConversationHistory
                  conversations={history.conversations}
                  enabled={history.enabled}
                  onToggle={history.setEnabled}
                  onOpen={(id) => {
                    handleOpenConversation(id);
                    setShowHistory(false);
                  }}
                  onDelete={handleDeleteConversation}
                  onClearAll={() => {
                    handleClearHistory();
                    setShowHistory(false);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
