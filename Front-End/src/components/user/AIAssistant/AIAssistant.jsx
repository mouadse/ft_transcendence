import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useChatConversations,
  useConversationMessages,
  useSendChatMessage,
  useSubmitChatFeedback,
} from '../../../hooks/queries/useChat';
import { getLocaleForLanguage, useI18n } from '../../../i18n/useI18n';
import './AIAssistant.css';

const STARTER_PROMPTS = [
  { id: 'weeklyAnalysis', labelKey: 'aiAssistant.starter.weeklyAnalysisLabel', promptKey: 'aiAssistant.starter.weeklyAnalysisPrompt' },
  { id: 'recoveryDay', labelKey: 'aiAssistant.starter.recoveryDayLabel', promptKey: 'aiAssistant.starter.recoveryDayPrompt' },
  { id: 'proteinCheck', labelKey: 'aiAssistant.starter.proteinCheckLabel', promptKey: 'aiAssistant.starter.proteinCheckPrompt' },
  { id: 'mealPlan', labelKey: 'aiAssistant.starter.mealPlanLabel', promptKey: 'aiAssistant.starter.mealPlanPrompt' },
];

const CONTEXT_LINKS = [
  {
    id: 'workouts',
    labelKey: 'aiAssistant.context.workouts',
    icon: 'fitness_center',
    path: '/workouts',
    state: { tab: 'programs' },
    keywords: ['workout', 'training', 'session', 'sets', 'reps', 'program', 'volume', 'cardio'],
  },
  {
    id: 'nutrition',
    labelKey: 'aiAssistant.context.nutrition',
    icon: 'restaurant',
    path: '/nutrition',
    keywords: ['nutrition', 'meal', 'calorie', 'protein', 'carbs', 'fat', 'macro', 'food'],
  },
  {
    id: 'exercise-library',
    labelKey: 'aiAssistant.context.exercises',
    icon: 'menu_book',
    path: '/workouts',
    state: { tab: 'library' },
    keywords: ['exercise', 'movement', 'form', 'muscle', 'technique', 'library'],
  },
];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatClock(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatThreadDate(value, locale, t) {
  if (!value) return t('aiAssistant.time.justNow');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('aiAssistant.time.justNow');
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return t('aiAssistant.time.todayAt', { time: formatClock(value, locale) });
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function inferContextLinks(content) {
  const normalized = (content || '').toLowerCase();
  if (!normalized) return [];
  return CONTEXT_LINKS.filter((link) =>
    link.keywords.some((keyword) => normalized.includes(keyword))
  );
}

function getConversationPreview(conversation) {
  const messages = toArray(conversation?.messages);
  const candidate = [...messages]
    .reverse()
    .find((m) => (m?.role === 'assistant' || m?.role === 'user') && m?.content);
  return candidate?.content || '';
}

function getConversationTitle(conversation, t) {
  const rawTitle = (conversation?.title || '').trim();
  if (rawTitle && rawTitle.toLowerCase() !== 'new conversation') return rawTitle;
  const preview = getConversationPreview(conversation);
  if (preview) return preview;
  return t('aiAssistant.newConversationTitle');
}

function sortMessagesChronologically(messages) {
  return toArray(messages)
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const aTime = Date.parse(a.message?.created_at || '') || 0;
      const bTime = Date.parse(b.message?.created_at || '') || 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.index - b.index;
    })
    .map((entry) => entry.message);
}

/* ── Message Bubble ────────────────────────────────────────────── */

function MessageBubble({ message, onFeedback, feedbackPending, onNavigate }) {
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);
  const isUser = message.role === 'user';
  const links = isUser ? [] : inferContextLinks(message.content);

  return (
    <article
      className={`coach-msg${isUser ? ' coach-msg--user' : ' coach-msg--assistant'}`}
    >
      <div className={`coach-bubble${isUser ? ' coach-bubble--user' : ' coach-bubble--assistant'}`}>
        {!isUser && (
          <span className="coach-badge">{t('aiAssistant.badge')}</span>
        )}

        <div className="coach-bubble__copy">
          {String(message.content || '')
            .split('\n')
            .filter((line) => line.trim())
            .map((line, i) => (
              <p key={`${message.id || message.created_at || 'm'}-${i}`}>{line}</p>
            ))}
        </div>

        {!isUser && links.length > 0 && (
          <div className="coach-bubble__links" role="group" aria-label={t('aiAssistant.aria.contextLinks')}>
            {links.map((link) => (
              <button
                key={`${message.id || message.created_at || 'm'}-${link.id}`}
                type="button"
                className="coach-ctx-link"
                onClick={() => onNavigate(link.path, link.state)}
              >
                <span className="material-symbols-outlined">{link.icon}</span>
                <span>{t(link.labelKey)}</span>
              </button>
            ))}
          </div>
        )}

        {!isUser && message.id && (
          <div className="coach-feedback" role="group" aria-label={t('aiAssistant.aria.rateAnswer')}>
            <button
              type="button"
              className={`coach-feedback__btn${message.feedback === 1 ? ' coach-feedback__btn--up' : ''}`}
              onClick={() => onFeedback(message.id, 1)}
              disabled={feedbackPending}
              aria-label={t('aiAssistant.aria.helpful')}
            >
              <span className="material-symbols-outlined">thumb_up</span>
            </button>
            <button
              type="button"
              className={`coach-feedback__btn${message.feedback === -1 ? ' coach-feedback__btn--down' : ''}`}
              onClick={() => onFeedback(message.id, -1)}
              disabled={feedbackPending}
              aria-label={t('aiAssistant.aria.needsImprovement')}
            >
              <span className="material-symbols-outlined">thumb_down</span>
            </button>
          </div>
        )}
      </div>

      <span className="coach-msg__time">{formatClock(message.created_at, locale)}</span>
    </article>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function AIAssistant() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);

  const [activeConversationId, setActiveConversationId] = useState(null);
  const [composerValue, setComposerValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [pendingFeedbackKey, setPendingFeedbackKey] = useState('');

  const threadEndRef = useRef(null);
  const composerRef = useRef(null);
  const pendingIdRef = useRef(0);
  const conversationVersionRef = useRef(0);

  const historyParams = useMemo(() => ({ page: 1, limit: 40 }), []);

  const { data: conversationsData, isLoading: conversationsLoading } =
    useChatConversations(historyParams);
  const { data: conversationData, isLoading: conversationLoading } =
    useConversationMessages(activeConversationId);

  const sendMessage = useSendChatMessage();
  const submitFeedback = useSubmitChatFeedback();

  const conversations = useMemo(() => {
    if (Array.isArray(conversationsData?.data)) return conversationsData.data;
    if (Array.isArray(conversationsData)) return conversationsData;
    return [];
  }, [conversationsData]);

  const renderedMessages = useMemo(() => {
    const serverMessages = sortMessagesChronologically(conversationData?.messages).filter((m) => {
      if (m?.role !== 'assistant' && m?.role !== 'user') return false;
      if (!m?.content) return false;
      return true;
    });

    if (pendingMessage?.conversationId === activeConversationId) {
      return [
        ...serverMessages,
        {
          id: pendingMessage.id,
          role: 'user',
          content: pendingMessage.content,
          created_at: pendingMessage.created_at,
        },
      ];
    }
    return serverMessages;
  }, [activeConversationId, conversationData?.messages, pendingMessage]);

  /* auto-scroll */
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [renderedMessages.length, sendMessage.isPending]);

  /* auto-resize textarea */
  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [composerValue]);

  const selectConversation = useCallback((id) => {
    conversationVersionRef.current += 1;
    setActiveConversationId(id);
  }, []);

  const startNewConversation = useCallback(() => {
    selectConversation(null);
    setHistoryOpen(false);
    setPendingMessage(null);
  }, [selectConversation, setHistoryOpen, setPendingMessage]);

  const handleSend = useCallback(
    (raw) => {
      const message = String(raw || '').trim();
      if (!message || sendMessage.isPending) return;

      pendingIdRef.current += 1;
      const srcId = activeConversationId;
      const srcVersion = conversationVersionRef.current;

      const optimistic = {
        id: `pending-${pendingIdRef.current}`,
        content: message,
        created_at: new Date().toISOString(),
        conversationId: srcId,
      };

      setPendingMessage(optimistic);
      setComposerValue('');

      sendMessage.mutate(
        { message, conversationId: srcId },
        {
          onSuccess: (response) => {
            if (response?.conversation_id && conversationVersionRef.current === srcVersion) {
              setActiveConversationId(response.conversation_id);
            }
            setPendingMessage((cur) => (cur?.id === optimistic.id ? null : cur));
          },
          onError: () => {
            setPendingMessage((cur) => (cur?.id === optimistic.id ? null : cur));
          },
        }
      );
    },
    [
      activeConversationId,
      sendMessage,
      setPendingMessage,
      setComposerValue,
      setActiveConversationId,
    ]
  );

  const handleFeedback = useCallback(
    (messageId, feedback) => {
      if (!activeConversationId || !messageId) return;
      const key = `${messageId}:${feedback}`;
      setPendingFeedbackKey(key);
      submitFeedback.mutate(
        { messageId, feedback, conversationId: activeConversationId },
        { onSettled: () => setPendingFeedbackKey('') }
      );
    },
    [activeConversationId, submitFeedback]
  );

  const handleNavigate = useCallback(
    (path, state) => navigate(path, state ? { state } : undefined),
    [navigate]
  );

  const starterPrompts = useMemo(
    () => STARTER_PROMPTS.map((item) => ({
      id: item.id,
      label: t(item.labelKey),
      prompt: t(item.promptKey),
    })),
    [t]
  );

  return (
    <div className="coach">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="coach-topbar">
        <div className="coach-topbar__left">
          <button
            type="button"
            className="coach-topbar__menu"
            onClick={() => setHistoryOpen(true)}
            aria-label={t('aiAssistant.aria.conversationHistory')}
          >
            <span className="material-symbols-outlined">history</span>
          </button>
          <div className="coach-topbar__brand">
            <span className="coach-topbar__eyebrow">{t('aiAssistant.topbar.eyebrow')}</span>
            <h1 className="coach-topbar__title">{t('aiAssistant.topbar.title')}</h1>
          </div>
        </div>

        <div className="coach-topbar__right">
          <button
            type="button"
            className="coach-topbar__new"
            onClick={startNewConversation}
          >
            <span className="material-symbols-outlined">add</span>
            <span>{t('aiAssistant.topbar.newChat')}</span>
          </button>
        </div>
      </header>

      {/* ── Shell ───────────────────────────────────────────── */}
      <div className="coach-shell">
        {/* ── History Drawer ──────────────────────────────── */}
        <aside className={`coach-history${historyOpen ? ' coach-history--open' : ''}`}>
          <div className="coach-history__head">
            <h2>{t('aiAssistant.history.threads')}</h2>
            <button type="button" className="coach-history__fresh" onClick={startNewConversation}>
              <span className="material-symbols-outlined">add</span>
              <span>{t('aiAssistant.history.new')}</span>
            </button>
          </div>

          <div className="coach-history__list">
            {conversationsLoading ? (
              <div className="coach-history__skeletons">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="coach-history__skeleton" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="coach-history__empty">
                <span className="material-symbols-outlined">chat_bubble_outline</span>
                <p>{t('aiAssistant.history.noSavedThreads')}</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const title = getConversationTitle(conv, t);
                const preview = getConversationPreview(conv) || t('aiAssistant.history.continueThread');
                const isActive = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    className={`coach-history__card${isActive ? ' coach-history__card--active' : ''}`}
                    onClick={() => {
                      selectConversation(conv.id);
                      setHistoryOpen(false);
                    }}
                  >
                    <span className="coach-history__card-title">{title}</span>
                    <span className="coach-history__card-preview">{preview}</span>
                    <span className="coach-history__card-date">
                      {formatThreadDate(conv.updated_at, locale, t)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main Panel ──────────────────────────────────── */}
        <section className="coach-panel">
          {/* Thread */}
          <section className="coach-thread" aria-live="polite">
            {activeConversationId && conversationLoading ? (
              <div className="coach-thread__loading">
                <div className="coach-thread__spinner" />
                <span>{t('aiAssistant.thread.loadingConversation')}</span>
              </div>
            ) : renderedMessages.length === 0 ? (
              <div className="coach-thread__empty">
                <div className="coach-thread__empty-icon">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <h3>{t('aiAssistant.thread.emptyTitle')}</h3>
                <p>
                  {t('aiAssistant.thread.emptyBody')}
                </p>
                <div className="coach-thread__empty-hint">
                  <span className="material-symbols-outlined">touch_app</span>
                  <span>{t('aiAssistant.thread.emptyHint')}</span>
                </div>
              </div>
            ) : (
              renderedMessages.map((message) => (
                <MessageBubble
                  key={message.id || message.created_at}
                  message={message}
                  onFeedback={handleFeedback}
                  feedbackPending={
                    submitFeedback.isPending && pendingFeedbackKey.startsWith(`${message.id}:`)
                  }
                  onNavigate={handleNavigate}
                />
              ))
            )}

            {sendMessage.isPending && (
              <article className="coach-msg coach-msg--assistant">
                <div className="coach-bubble coach-bubble--assistant coach-bubble--typing">
                  <span className="coach-badge">{t('aiAssistant.badge')}</span>
                  <div className="coach-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </article>
            )}

            <div ref={threadEndRef} />
          </section>

          {/* Composer */}
          <form
            className="coach-composer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(composerValue);
            }}
          >
            {renderedMessages.length === 0 && (
              <div className="coach-prompts" role="group" aria-label={t('aiAssistant.aria.starterPrompts')}>
                {starterPrompts.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    className="coach-prompt"
                    onClick={() => handleSend(sp.prompt)}
                    disabled={sendMessage.isPending}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            )}

            <div className="coach-composer__row">
              <textarea
                ref={composerRef}
                className="coach-composer__input"
                value={composerValue}
                rows={1}
                placeholder={t('aiAssistant.composer.placeholder')}
                onChange={(e) => setComposerValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(composerValue);
                  }
                }}
              />
              <button
                type="submit"
                className="coach-composer__send"
                disabled={!composerValue.trim() || sendMessage.isPending}
                aria-label={t('aiAssistant.aria.sendMessage')}
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* ── Backdrop ──────────────────────────────────────── */}
      {historyOpen && (
        <button
          type="button"
          className="coach-backdrop"
          aria-label={t('aiAssistant.aria.closeHistory')}
          onClick={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}
