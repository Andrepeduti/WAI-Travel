import { Icon } from '@/components/ui/Icon';
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantScreenProps {
  onBack: () => void;
  onOpenHistory: () => void;
  contextLabel?: string;
  onClearContext?: () => void;
}

const suggestions = [
  { emoji: '✈️', text: 'Criar roteiro do zero' },
  { emoji: '✨', text: 'Melhorar meu roteiro' },
  { emoji: '🌍', text: 'Explorar um destino' },
  { emoji: '📅', text: 'Otimizar dias de viagem' },
  { emoji: '💰', text: 'Roteiro econômico' },
  { emoji: '🍽️', text: 'Roteiro gastronômico' },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function AIAssistantScreen({ onBack, onOpenHistory, contextLabel, onClearContext }: AIAssistantScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const streamAssistant = useCallback(
    async (history: Message[]) => {
      const assistantId = `${Date.now()}-a`;
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            context: contextLabel,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let msg = 'Não foi possível responder agora.';
          try {
            const j = await res.json();
            if (j?.error) msg = j.error;
          } catch { /* noop */ }
          throw new Error(msg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let acc = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          // Process complete SSE events separated by \n\n
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            for (const line of rawEvent.split('\n')) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                const delta = json?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta.length > 0) {
                  acc += delta;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
                  );
                }
              } catch { /* ignore parse errors mid-chunk */ }
            }
          }
        }

        if (!acc.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: 'Não consegui gerar uma resposta agora. Tente reformular.' }
                : m,
            ),
          );
        }
      } catch (err: unknown) {
        const aborted = err instanceof Error && err.name === 'AbortError';
        if (!aborted) {
          const msg = err instanceof Error ? err.message : 'Erro ao falar com o assistente.';
          toast.error(msg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: `⚠️ ${msg}` } : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [contextLabel],
  );

  const sendMessage = (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Message = { id: `${Date.now()}-u`, role: 'user', content: text.trim() };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    void streamAssistant(nextHistory);
  };

  const handleSuggestionClick = (text: string) => sendMessage(text);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setIsStreaming(false);
    setShowMenuSheet(false);
  };

  const handleOpenHistory = () => {
    setShowMenuSheet(false);
    onOpenHistory();
  };

  const handleClearConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
    setShowMenuSheet(false);
  };

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const lastMessage = messages[messages.length - 1];
  const showTypingDots =
    isStreaming && (!lastMessage || lastMessage.role !== 'assistant' || lastMessage.content.length === 0);

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'hsl(var(--divider))', paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <BackButton onClick={onBack} />
        <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Assistente IA
        </span>
        <button
          onClick={() => setShowMenuSheet(true)}
          className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all"
          style={{ background: '#F2F2F2' }}
        >
          <Icon name="more_horiz" size={22} style={{ color: '#1A1C40' }} />
        </button>
      </header>

      {/* Messages / Empty State */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full px-6 pb-4">
            {contextLabel && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{ background: 'hsl(260 60% 96%)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'hsl(260 40% 50%)' }}>
                  Contexto: {contextLabel}
                </span>
                <button onClick={onClearContext} className="flex items-center justify-center">
                  <Icon name="close" size={14} style={{ color: 'hsl(260 40% 50%)' }} />
                </button>
              </div>
            )}

            <h2 className="text-xl font-bold text-center mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              O que você quer planejar hoje?
            </h2>
            <p className="text-sm text-center mb-8" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Crie roteiros, melhore sua viagem ou explore novos destinos com ajuda da IA.
            </p>

            <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(sug.text)}
                  className="flex items-center gap-2 px-3.5 py-3 rounded-xl border text-left transition-colors"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    background: 'hsl(var(--card))',
                  }}
                >
                  <span className="text-base flex-shrink-0">{sug.emoji}</span>
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    {sug.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0"
                    style={{ background: 'hsl(260 60% 94%)' }}
                  >
                    <Icon name="auto_awesome" size={14} style={{ color: 'hsl(260 50% 55%)' }} />
                  </div>
                )}
                <div className={`${msg.role === 'user' ? 'max-w-[80%]' : 'flex-1 min-w-0'}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl ${msg.role === 'user' ? 'max-w-full' : ''}`}
                    style={{
                      background: msg.role === 'assistant' ? 'hsl(260 60% 96%)' : 'hsl(var(--card))',
                      border: msg.role === 'user' ? '1px solid hsl(var(--border))' : 'none',
                      borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined,
                      borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      msg.content ? (
                        <div
                          className="text-sm leading-relaxed prose prose-sm max-w-none
                            prose-p:my-1.5 prose-headings:my-2 prose-headings:text-foreground
                            prose-strong:text-foreground prose-ul:my-1.5 prose-ol:my-1.5
                            prose-li:my-0.5 prose-a:text-primary"
                          style={{ color: 'hsl(var(--foreground))' }}
                        >
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 py-1">
                          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(260 40% 70%)', animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(260 40% 70%)', animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(260 40% 70%)', animationDelay: '300ms' }} />
                        </div>
                      )
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'hsl(var(--foreground))' }}>
                        {msg.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {showTypingDots && (
              <div className="flex justify-start">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0"
                  style={{ background: 'hsl(260 60% 94%)' }}
                >
                  <Icon name="auto_awesome" size={14} style={{ color: 'hsl(260 50% 55%)' }} />
                </div>
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'hsl(260 60% 96%)', borderBottomLeftRadius: 4 }}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(260 40% 70%)', animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(260 40% 70%)', animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(260 40% 70%)', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="px-4 pt-2 border-t"
        style={{ borderColor: 'hsl(var(--divider))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {contextLabel && hasMessages && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'hsl(260 60% 96%)' }}>
              <span className="text-[11px] font-medium" style={{ color: 'hsl(260 40% 50%)' }}>
                Perguntando sobre: {contextLabel}
              </span>
              <button onClick={onClearContext} className="flex items-center justify-center">
                <Icon name="close" size={12} style={{ color: 'hsl(260 40% 50%)' }} />
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre destinos ou roteiros…"
            className="flex-1 px-4 py-3 rounded-xl border text-base bg-transparent focus:outline-none"
            style={{
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              fontSize: 16,
            }}
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: (!input.trim() || isStreaming) ? '#D1D5DB' : '#9DCC36' }}
          >
            <Icon name="send" size={20} style={{ color: 'hsl(var(--background))' }} />
          </button>
        </form>
      </div>

      {/* Menu Bottom Sheet */}
      {showMenuSheet && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setShowMenuSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
            <div
              className="w-full w-full bg-background rounded-t-[24px] animate-in slide-in-from-bottom duration-300 pb-6"
              style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}
            >
              <div className="flex justify-center pt-3 pb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: '#E0E0E0' }} />
              </div>

              <div className="px-5">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl active:bg-muted/50 transition-colors"
                >
                  <Icon name="edit_square" size={20} style={{ color: '#141530' }} />
                  <span className="text-sm font-semibold" style={{ color: '#141530' }}>Novo chat</span>
                </button>

                <div className="h-px" style={{ background: '#F2F2F2' }} />

                <button
                  onClick={handleOpenHistory}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl active:bg-muted/50 transition-colors"
                >
                  <Icon name="history" size={20} style={{ color: '#141530' }} />
                  <span className="text-sm font-semibold" style={{ color: '#141530' }}>Histórico</span>
                </button>

                <div className="h-px" style={{ background: '#F2F2F2' }} />

                <button
                  onClick={hasMessages ? handleClearConversation : undefined}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl active:bg-muted/50 transition-colors disabled:opacity-40"
                  disabled={!hasMessages}
                >
                  <Icon name="delete" size={20} style={{ color: '#DA501F' }} />
                  <span className="text-sm font-semibold" style={{ color: '#DA501F' }}>Limpar conversa</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
