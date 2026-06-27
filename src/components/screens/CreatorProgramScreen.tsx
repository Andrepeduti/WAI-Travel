import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Users, DollarSign, ShieldCheck, Star, TrendingUp, Plus, FolderOpen, ChevronRight, X } from 'lucide-react';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import type { UserItinerary } from '@/lib/itinerariesApi';
import { useAuth } from '@/contexts/AuthContext';

interface CreatorProgramScreenProps {
  onBack: () => void;
  /** Inicia o fluxo "criar do zero". */
  onStartCreating: () => void;
  /** Abre um roteiro existente do usuário com o fluxo de publicação já aberto. */
  onPublishExisting?: (itinerary: UserItinerary) => void;
}

/**
 * Onboarding "Programa de Criadores" — tela única com hero + como funciona +
 * vantagens. O CTA "Começar a criar" abre uma escolha entre dois caminhos:
 *   1) Criar um roteiro do zero
 *   2) Publicar um roteiro existente (seleção entre os roteiros do usuário)
 */
export function CreatorProgramScreen({ onBack, onStartCreating, onPublishExisting }: CreatorProgramScreenProps) {
  const [showChoice, setShowChoice] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { session } = useAuth();
  const { itineraries, loading } = useMyItineraries();

  // Apenas roteiros criados pelo próprio usuário, ainda não publicados e
  // não originados de compra de marketplace.
  const eligible = useMemo(
    () =>
      itineraries.filter(
        (it) =>
          it.userId === session?.user?.id &&
          !it.isPublic &&
          it.sourceDatasetId == null,
      ),
    [itineraries, session?.user?.id],
  );

  const steps: { icon: typeof Users; title: string; desc: string; color: string }[] = [
    {
      icon: Sparkles,
      title: 'Comece um roteiro',
      desc: 'Crie do zero ou aproveite um que você já tem.',
      color: '#E8F1D4',
    },
    {
      icon: DollarSign,
      title: 'Defina o preço',
      desc: 'Escolha um valor ou disponibilize gratuitamente.',
      color: '#FCE7C8',
    },
    {
      icon: TrendingUp,
      title: 'Publique e venda',
      desc: 'Seu roteiro fica disponível no marketplace.',
      color: '#CDE3F3',
    },
  ];

  const benefits: { icon: typeof Users; title: string; desc: string; color: string }[] = [
    {
      icon: DollarSign,
      title: 'Ganhe renda extra',
      desc: 'Receba 90% por cada roteiro vendido. Você define o preço.',
      color: '#E8F1D4',
    },
    {
      icon: Users,
      title: 'Alcance global',
      desc: 'Seus roteiros disponíveis para milhares de viajantes.',
      color: '#CDE3F3',
    },
    {
      icon: Star,
      title: 'Destaque-se',
      desc: 'Criadores com boas avaliações ganham mais visibilidade.',
      color: '#F5D8E8',
    },
    {
      icon: ShieldCheck,
      title: 'Pagamentos seguros',
      desc: 'Saques via Pix com valor mínimo de R$ 30,00.',
      color: '#FCE7C8',
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-[#f2f2f2]">
      <div className="relative w-full h-full max-w-[430px] mx-auto bg-[#f2f2f2] flex flex-col">
        {/* Header fixo — fundo sólido para não sobrepor conteúdo */}
        <header className="sticky top-0 z-30 bg-[#f2f2f2]/95 backdrop-blur-md">
          <div className="flex items-center px-5 h-14">
            <button
              onClick={onBack}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center bg-background text-foreground hover:bg-background/80 transition-all shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          </div>
        </header>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Hero */}
          <section className="px-6 pt-6 pb-2">
            <h2
              className="text-foreground leading-[1.05] tracking-[-0.025em]"
              style={{ fontSize: '30px', fontWeight: 800 }}
            >
              Torne-se um<br />criador de roteiros
            </h2>
            <p className="mt-3 text-muted-foreground leading-snug max-w-[320px] text-[15px]">
              Transforme suas experiências de viagem em roteiros e ganhe uma renda extra.
            </p>
          </section>

          {/* Como funciona */}
          <section className="px-6 pt-6">
            <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide mb-3">
              Como funciona
            </h3>
            <div className="space-y-3">
              {steps.map(({ icon: ItemIcon, title, desc, color }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-background shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)]"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: color }}
                  >
                    <ItemIcon size={20} strokeWidth={2.2} className="text-foreground" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-[14px] font-bold text-foreground leading-tight">{title}</p>
                    <p className="text-[12.5px] text-muted-foreground leading-snug mt-1">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Vantagens */}
          <section className="px-6 pt-8">
            <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide mb-3">
              Vantagens
            </h3>
            <div className="space-y-3">
              {benefits.map(({ icon: ItemIcon, title, desc, color }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-background shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)]"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: color }}
                  >
                    <ItemIcon size={20} strokeWidth={2.2} className="text-foreground" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-[14px] font-bold text-foreground leading-tight">{title}</p>
                    <p className="text-[12.5px] text-muted-foreground leading-snug mt-1">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* CTA fixo no rodapé */}
        <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#f2f2f2] via-[#f2f2f2] to-transparent">
          <button
            onClick={() => setShowChoice(true)}
            className="w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)] transition-all"
          >
            Começar a criar
          </button>
        </div>

        {/* Sheet — escolha do caminho */}
        <AnimatePresence>
          {showChoice && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-black/40"
                onClick={() => setShowChoice(false)}
              />
              <motion.div
                key="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                className="absolute left-0 right-0 bottom-0 z-50 bg-background rounded-t-3xl max-h-[85vh] flex flex-col"
              >
                <div className="pt-3 pb-1 flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-foreground/15" />
                </div>
                <button
                  onClick={() => setShowChoice(false)}
                  className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-foreground/5"
                  aria-label="Fechar"
                >
                  <X size={18} className="text-foreground" />
                </button>

                <div className="px-6 pt-2 pb-2">
                  <h3 className="text-[20px] font-bold text-foreground tracking-[-0.02em]">
                    Como você quer começar?
                  </h3>
                  <p className="mt-1 text-[13.5px] text-muted-foreground leading-snug">
                    Crie um roteiro novo ou publique um que você já tem.
                  </p>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {/* Opção 1 — do zero */}
                  <button
                    onClick={() => {
                      setShowChoice(false);
                      onStartCreating();
                    }}
                    className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-background border-2 border-[#1A1C40]/10 hover:border-[#9DCC36] active:scale-[0.99] transition-all text-left"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#E8F1D4' }}
                    >
                      <Plus size={22} strokeWidth={2.4} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14.5px] font-bold text-foreground leading-tight">
                        Criar do zero
                      </p>
                      <p className="text-[12.5px] text-muted-foreground leading-snug mt-1">
                        Monte um roteiro novo do início.
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                  </button>

                  {/* Opção 2 — existente */}
                  <button
                    onClick={() => {
                      setShowChoice(false);
                      setShowPicker(true);
                    }}
                    className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-background border-2 border-[#1A1C40]/10 hover:border-[#9DCC36] active:scale-[0.99] transition-all text-left"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#CDE3F3' }}
                    >
                      <FolderOpen size={22} strokeWidth={2.2} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14.5px] font-bold text-foreground leading-tight">
                        Publicar um roteiro existente
                      </p>
                      <p className="text-[12.5px] text-muted-foreground leading-snug mt-1">
                        Escolha um dos seus roteiros para colocar à venda.
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                  </button>
                </div>

                <div className="h-[env(safe-area-inset-bottom)]" />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sheet — selecionar roteiro existente */}
        <AnimatePresence>
          {showPicker && (
            <>
              <motion.div
                key="picker-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-black/40"
                onClick={() => setShowPicker(false)}
              />
              <motion.div
                key="picker-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                className="absolute left-0 right-0 bottom-0 z-50 bg-background rounded-t-3xl max-h-[85vh] flex flex-col"
              >
                <div className="pt-3 pb-1 flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-foreground/15" />
                </div>
                <button
                  onClick={() => setShowPicker(false)}
                  className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-foreground/5"
                  aria-label="Fechar"
                >
                  <X size={18} className="text-foreground" />
                </button>

                <div className="px-6 pt-2 pb-2">
                  <h3 className="text-[20px] font-bold text-foreground tracking-[-0.02em]">
                    Escolha um roteiro
                  </h3>
                  <p className="mt-1 text-[13.5px] text-muted-foreground leading-snug">
                    Selecione um dos seus roteiros para publicar no marketplace.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
                  {loading ? (
                    <p className="text-center text-[13px] text-muted-foreground py-10">
                      Carregando seus roteiros…
                    </p>
                  ) : eligible.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-[#F2F2F2] mb-3">
                        <FolderOpen size={24} className="text-muted-foreground" />
                      </div>
                      <p className="text-[14px] font-semibold text-foreground">
                        Nenhum roteiro disponível
                      </p>
                      <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">
                        Você ainda não tem roteiros próprios para publicar. Crie um do zero para começar.
                      </p>
                      <button
                        onClick={() => {
                          setShowPicker(false);
                          onStartCreating();
                        }}
                        className="mt-4 px-4 h-10 rounded-xl font-semibold text-[13.5px] bg-[#9DCC36] text-[#0A0A0A]"
                      >
                        Criar do zero
                      </button>
                    </div>
                  ) : (
                    eligible.map((it) => {
                      const cover = it.images?.find((img) => img && !img.startsWith('blob:'));
                      return (
                        <button
                          key={it.id}
                          onClick={() => {
                            setShowPicker(false);
                            onPublishExisting?.(it);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-background border border-[#1A1C40]/10 hover:border-[#9DCC36] active:scale-[0.99] transition-all text-left"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#F2F2F2]">
                            {cover ? (
                              <img src={cover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Sparkles size={18} className="text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-foreground truncate">
                              {it.title || 'Roteiro sem nome'}
                            </p>
                            <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                              {it.destinations.slice(0, 2).join(' · ') || 'Sem destinos'}
                            </p>
                          </div>
                          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="h-[env(safe-area-inset-bottom)]" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
