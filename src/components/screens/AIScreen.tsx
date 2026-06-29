import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';

const suggestions = [
  { icon: '🏖️', text: 'Roteiro de praia para casal' },
  { icon: '🏔️', text: 'Aventura na Europa' },
  { icon: '🍷', text: 'Rota gastronômica na Itália' },
  { icon: '🎄', text: 'Mercados de Natal' },
];

const recentChats = [
  {
    id: 1,
    title: 'Roteiro Leste Europeu',
    preview: 'Criamos um roteiro incrível de 7 dias...',
    date: 'Ontem',
  },
  {
    id: 2,
    title: 'Dicas de Bali',
    preview: 'As melhores praias para visitar são...',
    date: '3 dias atrás',
  },
];

export function AIScreen() {
  const [message, setMessage] = useState('');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-5 pt-safe-top pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Icon name="auto_awesome" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">WAI</h1>
            <p className="text-xs text-muted-foreground">Seu assistente de viagens</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-5 section-stack">
        {/* Welcome Card */}
        <div 
          className="rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}
        >
          <h2 className="text-lg font-bold mb-2">Olá! Como posso ajudar?</h2>
          <p className="text-sm text-white/80 mb-4">
            Posso criar roteiros personalizados, dar dicas de viagem, 
            encontrar as melhores ofertas e muito mais.
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: 'location_on', label: 'Destinos' },
              { icon: 'calendar_today', label: 'Planejamento' },
              { icon: 'group', label: 'Grupos' },
              { icon: 'flight', label: 'Voos' },
            ].map((item) => (
              <div 
                key={item.label}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10 backdrop-blur-sm"
              >
                <Icon name={item.icon} size={16} className="text-white" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        <section>
          <p className="text-sm font-semibold text-muted-foreground mb-3">Sugestões</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => setMessage(sug.text)}
                className="chip-outlined"
              >
                <span>{sug.icon}</span>
                <span>{sug.text}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Chats */}
        <section>
          <p className="text-sm font-semibold text-muted-foreground mb-3">Conversas recentes</p>
          <div className="space-y-2">
            {recentChats.map((chat) => (
              <button
                key={chat.id}
                className="w-full p-4 card-base text-left"
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-sm">{chat.title}</h4>
                  <span className="text-[10px] text-muted-foreground">{chat.date}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{chat.preview}</p>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Input Bar */}
      <div className="fixed bottom-20 left-0 right-0 px-5 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="max-w-[430px] mx-auto flex items-center gap-2 p-2 bg-card rounded-2xl border border-border shadow-lg">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Pergunte qualquer coisa..."
            className="flex-1 px-3 py-2 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button 
            className="w-12 h-12 rounded-full flex items-center justify-center disabled:bg-[#E7E7EE]"
            style={{ background: message.trim() ? 'hsl(var(--primary))' : undefined }}
            disabled={!message.trim()}
          >
            <Icon name="send" size={24} style={{ color: message.trim() ? 'hsl(var(--foreground))' : '#CACAD0' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
