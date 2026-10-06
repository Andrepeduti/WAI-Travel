export type TourPlacement = 'top' | 'bottom' | 'center';

export interface TourStep {
  id: string;
  /** CSS selector resolved at runtime. When undefined, step is centered. */
  target?: string;
  title: string;
  body: string;
  placement?: TourPlacement;
  /** Optional tab to switch to before showing the step. */
  ensureTab?: 'home' | 'trips';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Conheça o WAI em 1 minuto',
    body: 'Vamos te mostrar as principais funções para você começar a planejar suas viagens.',
    placement: 'center',
  },
  {
    id: 'search',
    target: '[data-tour-id="home-search"]',
    title: 'Buscar',
    body: 'Descubra destinos e roteiros prontos feitos por outros viajantes.',
    placement: 'bottom',
    ensureTab: 'home',
  },
  {
    id: 'create',
    target: '[data-tour-id="nav-create"]',
    title: 'Criar',
    body: 'Crie um roteiro do zero, monte uma coleção ou extraia lugares de um vídeo do Instagram ou TikTok.',
    placement: 'top',
    ensureTab: 'home',
  },
  {
    id: 'trips',
    target: '[data-tour-id="nav-trips"]',
    title: 'Suas viagens',
    body: 'Acesse aqui seus roteiros pessoais, compartilhados e comprados.',
    placement: 'top',
    ensureTab: 'home',
  },
  {
    id: 'publish',
    title: 'Colocar um roteiro à venda',
    body: 'Abra um roteiro seu em Viagens e use o menu de opções para publicá-lo no marketplace e começar a monetizar. Quem vende tem a aba Minha loja para acompanhar tudo.',
    placement: 'center',
  },
  {
    id: 'done',
    title: 'Tudo pronto!',
    body: 'Você pode refazer este tour quando quiser em Perfil > Central de ajuda.',
    placement: 'center',
  },
];

export const TOUR_STORAGE_KEY = 'wai_tour_v1_completed';
export const TOUR_RESTART_EVENT = 'wai:restart-tour';
