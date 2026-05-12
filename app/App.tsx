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
import { AdminDashboard } from "./components/AdminDashboard";
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
import {
  type TopicCard,
  buildTopicCards,
  getDefaultTopicCards,
  getTopicCard,
  rankRelevantTopicCards,
} from "@/lib/topicCatalog";
const PRIVACY_POLICY_URL =
  "https://cvsu.edu.ph/office-of-the-data-protection-officer/general-data-privacy-notice/";

const WELCOME_TEXT =
  "Welcome to DIWA, the CvSU Digital Interface Web Assistant! I'm here to help with information about admissions, enrollment, courses, facilities, and more. What can I help you with today?";

const CONSENT_PROMPT_TEXT =
  `Hello and welcome to Cavite State University! I'm DIWA — the CvSU Digital Interface Web Assistant. ` +
  `To continue this conversation, please acknowledge and agree to our [Data Privacy Notice](${PRIVACY_POLICY_URL}). ` +
  `If you agree, kindly click the **I Agree** button below.`;

const LOW_CONFIDENCE_THRESHOLD = 0.5;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.8;
const FOLLOWUP_LOW_CONFIDENCE =
  "I may have missed your question. Try one of these related topics, or rephrase your question with a little more detail.";
const FOLLOWUP_MEDIUM_CONFIDENCE =
  "Did this answer your question? Use the feedback buttons above so I can improve the next answer.";

export default function App() {
  const userId = useMemo(() => getUserId(), []);
  const sessionId = useMemo(() => getSessionId(), []);

  const consent = useConsent();
  const apiHealth = useApiHealth();
  const [inputValue, setInputValue] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [availableIntentTags, setAvailableIntentTags] = useState<string[]>([]);
  const [categoriesHeading, setCategoriesHeading] = useState("Common questions");
  const [categories, setCategories] = useState<TopicCard[]>(() => getDefaultTopicCards());
  const inputRef = useRef<HTMLInputElement>(null);

  const scroll = useSmartScroll();

  const chat = useChat({
    userId,
    sessionId,
    initialMessages: [],
    onBotResponse: (res, userInput) => {
      if (res.confidence < LOW_CONFIDENCE_THRESHOLD) {
        chat.pushMessage({ text: FOLLOWUP_LOW_CONFIDENCE, isBot: true, followUp: true });
        setCategoriesHeading("Try one of these topics");
        setCategories(rankRelevantTopicCards(userInput, res.intent, availableIntentTags));
        setShowCategories(true);
      } else if (res.confidence < MEDIUM_CONFIDENCE_THRESHOLD) {
        chat.pushMessage({ text: FOLLOWUP_MEDIUM_CONFIDENCE, isBot: true, followUp: true });
      }
    },
  });

  // Auto-scroll for new messages with smart behavior.
  useEffect(() => {
    const last = chat.messages[chat.messages.length - 1];
    if (!last) return;
    scroll.notifyNewMessage(!last.isBot);
  }, [chat.messages, scroll]);

  useEffect(() => {
    if (!chat.isTyping) inputRef.current?.focus();
  }, [chat.isTyping]);

  useEffect(() => {
    void loadCoords();
    void loadWaypoints();
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
    messageId: number,
    intent: string | undefined,
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

  let inputPlaceholder = "Message DIWA…";
  if (awaitingConsent) {
    inputPlaceholder = "Please agree to the Data Privacy Notice to continue…";
  } else if (chat.isTyping) {
    inputPlaceholder = "DIWA is replying…";
  }

  const handleAcceptConsent = () => {
    consent.accept();
    setShowCategories(true);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-dvh w-full bg-gradient-to-br from-green-50 via-white to-green-100 flex items-stretch justify-center p-0 sm:items-center sm:p-4">
      <div className="relative flex min-h-dvh w-full max-w-4xl flex-col overflow-hidden bg-white shadow-xl sm:h-[95vh] sm:min-h-0 sm:max-h-[920px] sm:rounded-3xl sm:shadow-2xl">

        <header className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-4 flex items-center gap-3 flex-shrink-0 sm:px-6 sm:py-5 sm:gap-4">
          <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center sm:h-14 sm:w-14">
            <GraduationCap className="h-6 w-6 text-green-600 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="mb-0.5 text-lg font-semibold text-white sm:mb-1 sm:text-xl">DIWA</h1>
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  apiHealth === "online"
                    ? "bg-green-300 animate-pulse"
                    : apiHealth === "offline"
                      ? "bg-red-400"
                      : "bg-yellow-300 animate-pulse"
                }`}
                aria-hidden="true"
              />
              <p className="text-xs text-green-100 sm:text-sm">
                {apiHealth === "online"
                  ? "Online"
                  : apiHealth === "offline"
                    ? "Offline"
                    : "Connecting…"}{" "}
                · CvSU Virtual Assistant
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAdmin(true)}
            className="h-10 w-10 rounded-full bg-white/20 active:bg-white/40 flex items-center justify-center transition-colors"
            aria-label="Admin dashboard"
          >
            <BarChart3 className="h-5 w-5 text-white" />
          </button>
        </header>

        <AnimatePresence>
          {chat.apiError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2 text-xs text-amber-800 sm:px-6 sm:items-center">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span>API unreachable: {chat.apiError}. Make sure the chatbot server is running.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={scroll.containerRef}
          onScroll={scroll.onScroll}
          className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
        >
          <ChatMessage
            message={initialBotText}
            isBot={true}
            timestamp={initialBotTimestamp}
            isGrouped={false}
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
                confidence={message.confidence}
                messageId={message.messageId}
                isGrouped={isGrouped}
                onFeedback={
                  message.messageId !== undefined
                    ? (submission) =>
                        handleFeedback(message.messageId!, message.intent, submission)
                    : undefined
                }
                typing={message.id === chat.typingMessageId}
                onTypingDone={chat.clearTypingMessageId}
                mapData={message.mapData}
                directory={message.directory}
                intent={message.intent}
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
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
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
          <div className="flex items-center gap-2 sm:gap-3">
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
          <p className="mt-2.5 text-center text-[11px] text-gray-400">
            Urgent concerns? Call CvSU: (046) 430-6332
          </p>
        </div>

        <AnimatePresence>
          {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
