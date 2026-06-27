import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

interface AchievementsScreenProps {
  onBack: () => void;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  bgColor: string;
}

interface AchievementCategory {
  name: string;
  unlocked: number;
  total: number;
  achievements: Achievement[];
}

const achievementCategories: AchievementCategory[] = [
  {
    name: 'Viagens',
    unlocked: 4,
    total: 6,
    achievements: [
      { id: 1, name: 'Primeira viagem de avião', description: 'Complete sua primeira viagem aérea', icon: '✈️', unlocked: true, bgColor: 'hsl(var(--cyan-light))' },
      { id: 2, name: 'Explorador global', description: 'Visite 5 países diferentes', icon: '🌍', unlocked: true, bgColor: 'hsl(var(--capri-light-hover))' },
      { id: 3, name: 'Mochileiro', description: 'Faça 10 viagens', icon: '🎒', unlocked: true, bgColor: 'hsl(var(--sun-light))' },
      { id: 4, name: 'Amante de ilhas', description: 'Visite 3 ilhas diferentes', icon: '🏝️', unlocked: true, bgColor: 'hsl(var(--primary-light))' },
      { id: 5, name: 'Montanhista', description: 'Visite 5 montanhas', icon: '⛰️', unlocked: false, bgColor: 'hsl(var(--muted))' },
      { id: 6, name: 'Vida noturna', description: 'Explore 10 cidades à noite', icon: '🌙', unlocked: false, bgColor: 'hsl(var(--muted))' },
    ]
  },
  {
    name: 'Destinos',
    unlocked: 3,
    total: 6,
    achievements: [
      { id: 7, name: '20 praias visitadas', description: 'Visite 20 praias ao redor do mundo', icon: '🏖️', unlocked: true, bgColor: 'hsl(var(--capri-light-hover))' },
      { id: 8, name: 'Historiador', description: 'Visite 15 museus', icon: '🏛️', unlocked: true, bgColor: 'hsl(var(--sun-light))' },
      { id: 9, name: 'Foodie', description: 'Experimente 30 restaurantes', icon: '🍽️', unlocked: true, bgColor: 'hsl(var(--florida-light-hover))' },
      { id: 10, name: 'Cultura viva', description: 'Assista 10 shows ao vivo', icon: '🎭', unlocked: false, bgColor: 'hsl(var(--muted))' },
      { id: 11, name: 'Realeza', description: 'Visite 8 castelos históricos', icon: '🏰', unlocked: false, bgColor: 'hsl(var(--muted))' },
      { id: 12, name: 'Jardim secreto', description: 'Descubra 12 jardins botânicos', icon: '🌺', unlocked: false, bgColor: 'hsl(var(--muted))' },
    ]
  },
  {
    name: 'Social',
    unlocked: 3,
    total: 6,
    achievements: [
      { id: 13, name: 'Primeiro roteiro criado', description: 'Crie seu primeiro roteiro', icon: '🗺️', unlocked: true, bgColor: 'hsl(var(--florida-light-hover))' },
      { id: 14, name: 'Conectado', description: 'Faça 100 conexões', icon: '🤝', unlocked: true, bgColor: 'hsl(var(--capri-light-hover))' },
      { id: 15, name: 'Avaliador expert', description: 'Dê 50 avaliações', icon: '⭐', unlocked: true, bgColor: 'hsl(var(--sun-light))' },
      { id: 16, name: 'Conversador', description: 'Participe de 25 conversas', icon: '💬', unlocked: false, bgColor: 'hsl(var(--muted))' },
      { id: 17, name: 'Fotógrafo', description: 'Compartilhe 100 fotos', icon: '📸', unlocked: false, bgColor: 'hsl(var(--muted))' },
      { id: 18, name: 'Generoso', description: 'Ajude 25 viajantes', icon: '💝', unlocked: false, bgColor: 'hsl(var(--muted))' },
    ]
  },
  {
    name: 'Especiais',
    unlocked: 0,
    total: 4,
    achievements: [
      { id: 19, name: 'Lenda', description: 'Complete todas as conquistas', icon: '🏆', unlocked: false, bgColor: 'hsl(var(--muted))' },
      { id: 20, name: 'VIP', description: 'Seja membro premium por 1 ano', icon: '👑', unlocked: false, bgColor: 'hsl(var(--muted))' },
      { id: 21, name: 'Influenciador', description: 'Tenha 1000 seguidores', icon: '🌟', unlocked: false, bgColor: 'hsl(var(--muted))' },
      { id: 22, name: 'Em chamas', description: 'Use o app por 30 dias seguidos', icon: '🔥', unlocked: false, bgColor: 'hsl(var(--muted))' },
    ]
  }
];

const currentLevel = {
  name: 'Viajante Aventureiro',
  icon: '⛺',
  progress: 10,
  total: 22,
  levelProgress: 4,
  levelTotal: 5,
  remaining: 1
};

export function AchievementsScreen({ onBack }: AchievementsScreenProps) {
  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <BackButton onClick={onBack} />
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Minhas conquistas
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-6">
        {/* Current Level Card */}
        <div className="card-base p-5 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(var(--cyan-light)), hsl(var(--primary-light)))' }}
            >
              <span className="text-3xl">{currentLevel.icon}</span>
            </div>
            <div>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                Nível atual
              </p>
              <h2 className="text-primary" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                {currentLevel.name}
              </h2>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                {currentLevel.progress}/{currentLevel.total} conquistas
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                Progresso do nível
              </span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                {currentLevel.levelProgress}/{currentLevel.levelTotal}
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill"
                style={{ 
                  width: `${(currentLevel.levelProgress / currentLevel.levelTotal) * 100}%`,
                  background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--cyan-normal)))'
                }}
              />
            </div>
          </div>

          <p className="text-center text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
            Faltam {currentLevel.remaining} conquistas para o próximo nível
          </p>
        </div>

        {/* Achievement Categories */}
        <div className="space-y-8">
          {achievementCategories.map((category) => (
            <div key={category.name}>
              <h3 
                className="mb-4"
                style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}
              >
                {category.name} ({category.unlocked}/{category.total})
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                {category.achievements.map((achievement) => (
                  <div 
                    key={achievement.id}
                    className={`achievement-badge relative ${!achievement.unlocked ? 'achievement-badge-locked' : ''}`}
                  >
                    {!achievement.unlocked && (
                      <div className="absolute top-2 right-2">
                        <Icon name="lock" size={14} className="text-muted-foreground" />
                      </div>
                    )}
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
                      style={{ background: achievement.bgColor }}
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                    </div>
                    <span 
                      className="text-center"
                      style={{ 
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-weight-semibold)'
                      }}
                    >
                      {achievement.name}
                    </span>
                    <span 
                      className="text-center text-muted-foreground mt-0.5"
                      style={{ fontSize: '10px' }}
                    >
                      {achievement.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}