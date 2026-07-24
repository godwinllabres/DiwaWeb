import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { ChatMessage, type FeedbackSubmission } from "./components/ChatMessage";
import { QuickActionButton } from "./components/QuickActionButton";
import { CategoryCard } from "./components/CategoryCard";
import { TypingIndicator } from "./components/TypingIndicator";
import { ChatSidebar } from "./components/ChatSidebar";
import { LandingPage } from "./components/LandingPage";
import { warmSeviStickers } from "./components/SeviSticker";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { api } from "@/lib/api";
import { loadCoords } from "@/lib/coordsStore";
import { loadWaypoints } from "@/lib/waypointsStore";
import { useConsent } from "@/lib/hooks/useConsent";
import { getUserId, getSessionId } from "@/lib/ids";
import { timeNow } from "@/lib/time";
import { pickIcon } from "@/lib/iconMap";
import { useChat } from "@/lib/hooks/useChat";
import { useSmartScroll } from "@/lib/hooks/useSmartScroll";
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
  // Single source of truth for AIS auth state across all chat bubbles.
  // useAuth runs whoami on mount so a page refresh in the middle of an
  // active session restores the logged-in identity without a new login.
  const ais = useAuth(sessionId);

  const consent = useConsent();
  const apiHealth = useApiHealth();
  const [inputValue, setInputValue] = useState("");
  const [showCategories, setShowCategories] = useState(true);
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

  const chat = useChat({
    userId,
    sessionId,
    initialMessages: [],
    onBotResponse: (res, userInput) => {
      // Only apologize on a genuine miss — the static canned fallback
      // (source === "fallback"). When the local/Claude LLM actually answered
      // (still tagged intent nlu_fallback, but source llm_local/llm_claude),
      // the reply is real, so don't append "I may have missed your question".
      if (res.source === "fallback") {
        chat.pushMessage({ text: FOLLOWUP_LOW_CONFIDENCE, isBot: true, followUp: true });
        setCategoriesHeading("Try one of these topics");
        setCategories(rankRelevantTopicCards(userInput, res.intent, availableIntentTags));
        setShowCategories(true);
      }
    },
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

  const handleFeedback = async (
    intent: string | undefined,
    messageId: number | undefined,
    submission: FeedbackSubmission,
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
  };

  const handleStartOver = () => {
    chat.resetMessages();
    setShowCategories(true);
    setInputValue("");
    resetCategories();
    scroll.scrollToBottom(true);
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
    inputPlaceholder = "Server unreachable — you can still try sending…";
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
    <div className="min-h-dvh w-full bg-white lg:bg-green-50/40">
      <div className="relative mx-auto flex h-dvh w-full">
        {/* Desktop conversation rail — hidden until lg, so the ≤420px widget
            iframe keeps the single-column phone layout. */}
        <ChatSidebar
          className="hidden lg:flex"
          topics={categories}
          onStartOver={handleStartOver}
          onTopic={handleQuickAction}
        />
        {/* Main column. On tablet/desktop the conversation, quick actions, and
            composer center in a readable width instead of stretching edge-to-
            edge; on phone this is a no-op. */}
        <div className="relative flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="hidden items-center gap-3 border-b border-gray-100 px-6 py-3 lg:flex">
            <span className="text-sm font-semibold text-gray-900">CvSU Virtual Assistant</span>
            <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
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
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2 text-xs text-amber-800 sm:px-6 sm:items-center">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span className="min-w-0 flex-1">
                  {chat.apiError
                    ? `Sevi couldn't get a reply (${chat.apiError}).`
                    : "Can't reach the CvSU server right now — replies may fail."}
                </span>
                {chat.apiError && (
                  <button
                    onClick={() => {
                      chat.setApiError(null);
                      chat.retryLast();
                    }}
                    className="flex-shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 transition-colors hover:bg-amber-100"
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
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-6"
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
                className="inline-flex items-center gap-2 rounded-xl border border-green-600 bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 sm:text-base"
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
                onFeedback={
                  message.isBot && !message.followUp
                    ? (submission) =>
                        handleFeedback(message.intent, message.messageId, submission)
                    : undefined
                }
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
                className="mt-5 space-y-3"
              >
                <p className="text-sm text-gray-500 font-medium px-1">{categoriesHeading}</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {categories.map((category) => (
                    <CategoryCard
                      key={category.tag}
                      icon={pickIcon(category.tag)}
                      title={category.title}
                      description={category.description}
                      onClick={() => handleQuickAction(category)}
                    />
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
              className="absolute bottom-[140px] right-4 z-10 flex items-center gap-1.5 rounded-full bg-white pl-3 pr-3.5 py-2 shadow-lg border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50 sm:bottom-[160px] sm:right-6"
            >
              <ChevronDown className="h-4 w-4 text-gray-500" />
              {scroll.hasNewMessage && <span className="text-green-600 text-xs">New message</span>}
            </motion.button>
          )}
        </AnimatePresence>

        {!showCategories && (
          <div className="border-t border-gray-100 bg-white px-4 py-2.5 sm:px-6">
            <div className="mx-auto flex w-full gap-2 overflow-x-auto scrollbar-none pb-0.5 md:max-w-2xl lg:max-w-3xl">
              <QuickActionButton icon={Home} label="Start Over" onClick={handleStartOver} />
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

        <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex-shrink-0 sm:px-6 sm:pt-4 sm:pb-5">
          <div className="mx-auto flex w-full items-center gap-2 sm:gap-3 md:max-w-2xl lg:max-w-3xl">
            <div className="relative min-w-0 flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={awaitingConsent}
                placeholder={inputPlaceholder}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-tight focus:outline-none focus:border-green-500 focus:bg-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:text-base"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sendDisabled}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-green-600 transition-colors active:bg-green-800 disabled:bg-gray-200 sm:h-12 sm:w-12"
              aria-label="Send message"
            >
              <Send className="h-4 w-4 text-white sm:h-5 sm:w-5" />
            </button>
          </div>
          {/* Always-visible accuracy disclosure — the in-reply disclaimer only
              shows on intents most users never trigger. Low emphasis on
              purpose: present on every turn, shouting on none. */}
          <p className="mx-auto mt-2 w-full text-center text-[11px] leading-tight text-gray-400 md:max-w-2xl lg:max-w-3xl">
            Sevi can make mistakes — verify important details with the official{" "}
            <a
              href="https://cvsu.edu.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-500"
            >
              CvSU website
            </a>{" "}
            or the office concerned.
          </p>
        </div>

        </div>

      </div>
    </div>
  );
}
