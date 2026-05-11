import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  GraduationCap,
  BookOpen,
  Users,
  MapPin,
  FileText,
  Calendar,
  Home,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { ChatMessage } from "./components/ChatMessage";
import { QuickActionButton } from "./components/QuickActionButton";
import { CategoryCard } from "./components/CategoryCard";
import { TypingIndicator } from "./components/TypingIndicator";
import { AdminDashboard } from "./components/AdminDashboard";
import { motion, AnimatePresence } from "motion/react";
import { api } from "./lib/api";
import { getUserId, getSessionId } from "./lib/ids";
import { TopicCard, getDefaultTopicCards, getTopicCard, rankRelevantTopicCards } from "./lib/topicCatalog";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: string;
  intent?: string;
  confidence?: number;
  messageId?: number;
  followUp?: boolean;
}

const ICON_MAP: Record<string, any> = {
  admissions: FileText,
  enrollment: Calendar,
  courses: BookOpen,
  programs: BookOpen,
  graduate: GraduationCap,
  facilities: MapPin,
  campus: MapPin,
  library: BookOpen,
  support: Users,
  services: Users,
  schedule: Calendar,
  tuition: FileText,
  scholarship: GraduationCap,
  contact: Users,
  registrar: Users,
  academic: Calendar,
  events: Calendar,
  vision: GraduationCap,
  about: GraduationCap,
};

function pickIcon(tag: string) {
  const key = Object.keys(ICON_MAP).find((candidate) => tag.toLowerCase().includes(candidate));
  return key ? ICON_MAP[key] : BookOpen;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const userId = useMemo(() => getUserId(), []);
  const sessionId = useMemo(() => getSessionId(), []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Welcome to Sevi, the CvSU Virtual Assistant! I'm here to help with information about admissions, enrollment, courses, facilities, and more. What can I help you with today?",
      isBot: true,
      timestamp: timeNow(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [availableIntentTags, setAvailableIntentTags] = useState<string[]>([]);
  const [categoriesHeading, setCategoriesHeading] = useState("Common questions");
  const [categories, setCategories] = useState<TopicCard[]>(() => getDefaultTopicCards());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounterRef = useRef(2);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping) {
      inputRef.current?.focus();
    }
  }, [isTyping]);

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
      .catch(() => {
        // Keep the curated defaults if the intent list is unavailable.
      });
  }, []);

  const pushMessage = (message: Omit<Message, "id" | "timestamp"> & { timestamp?: string }) => {
    const id = idCounterRef.current++;
    setMessages((prev) => [...prev, { id, timestamp: message.timestamp ?? timeNow(), ...message }]);
    return id;
  };

  const resetCategories = () => {
    setCategoriesHeading("Common questions");
    setCategories(getDefaultTopicCards(availableIntentTags));
  };

  const sendToApi = async (text: string) => {
    setIsTyping(true);
    setApiError(null);

    try {
      const res = await api.chat({
        message: text,
        user_id: userId,
        session_id: sessionId,
      });

      pushMessage({
        text: res.response,
        isBot: true,
        intent: res.intent,
        confidence: res.confidence,
        messageId: res.message_id ?? undefined,
      });

      if (res.confidence < 0.5) {
        pushMessage({
          text: "I may have missed your question. Try one of these related topics, or rephrase your question with a little more detail.",
          isBot: true,
          followUp: true,
        });
        setCategoriesHeading("Try one of these topics");
        setCategories(rankRelevantTopicCards(text, res.intent, availableIntentTags));
        setShowCategories(true);
      } else if (res.confidence < 0.8) {
        pushMessage({
          text: "Did this answer your question? Use the feedback buttons above so I can improve the next answer.",
          isBot: true,
          followUp: true,
        });
      }
    } catch (error: any) {
      setApiError(error?.message ?? "Network error");
      pushMessage({
        text: "I'm having trouble reaching the server right now. Please try again in a moment, or contact CvSU at (046) 430-6332.",
        isBot: true,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    pushMessage({ text, isBot: false });
    setInputValue("");
    setShowCategories(false);
    sendToApi(text);
  };

  const handleQuickAction = (topic: TopicCard) => {
    if (isTyping) return;

    setShowCategories(false);
    pushMessage({ text: topic.prompt, isBot: false });
    sendToApi(topic.prompt);
  };

  const handleFeedback = async (messageId: number, intent: string | undefined, helpful: boolean) => {
    try {
      await api.submitFeedback({
        message_id: messageId,
        user_id: userId,
        session_id: sessionId,
        intent,
        helpful,
        rating: helpful ? 5 : 2,
      });
    } catch {
      // Ignore feedback errors to avoid interrupting the conversation.
    }
  };

  const handleStartOver = () => {
    setMessages([messages[0]]);
    setShowCategories(true);
    setInputValue("");
    resetCategories();
    idCounterRef.current = 2;
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-dvh w-full bg-gradient-to-br from-green-50 via-white to-green-100 flex items-stretch justify-center p-0 sm:items-center sm:p-4">
      <div className="relative flex min-h-dvh w-full max-w-4xl flex-col overflow-hidden bg-white shadow-xl sm:h-[95vh] sm:min-h-0 sm:max-h-[920px] sm:rounded-3xl sm:shadow-2xl">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-4 flex items-center gap-3 flex-shrink-0 sm:px-6 sm:py-5 sm:gap-4">
          <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center sm:h-14 sm:w-14">
            <GraduationCap className="h-6 w-6 text-green-600 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="mb-0.5 text-lg text-white sm:mb-1 sm:text-xl">Sevi</h1>
            <p className="text-xs text-green-100 sm:text-sm">Your CvSU Virtual Assistant</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdmin(true)}
              className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              aria-label="Admin dashboard"
              title="Admin dashboard"
            >
              <BarChart3 className="h-5 w-5 text-white" />
            </button>
            <div className="h-2.5 w-2.5 rounded-full bg-green-300 animate-pulse sm:h-3 sm:w-3" />
          </div>
        </div>

        {apiError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2 text-xs text-amber-800 sm:px-6 sm:items-center">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>API unreachable: {apiError}. Make sure the chatbot server is running.</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.text}
              isBot={message.isBot}
              timestamp={message.timestamp}
              confidence={message.confidence}
              messageId={message.messageId}
              onFeedback={
                message.messageId !== undefined
                  ? (helpful) => handleFeedback(message.messageId!, message.intent, helpful)
                  : undefined
              }
            />
          ))}

          {isTyping && <TypingIndicator />}

          <AnimatePresence>
            {showCategories && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 space-y-3"
              >
                <p className="mb-4 text-sm text-gray-600">{categoriesHeading}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          <div ref={messagesEndRef} />
        </div>

        {!showCategories && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-2">
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

        <div className="border-t border-gray-200 bg-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex-shrink-0 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isTyping ? "Sevi is typing..." : "Type your question here..."}
              disabled={isTyping}
              className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-green-600 transition-colors disabled:bg-gray-50 sm:text-base"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-600 transition-colors hover:bg-green-700 disabled:bg-gray-300"
            >
              <Send className="h-5 w-5 text-white" />
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500 sm:text-xs">
            For urgent concerns, contact CvSU Main Campus: (046) 430-6332
          </p>
        </div>

        <AnimatePresence>
          {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
