import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  /** URL da foto. Quando vazio/undefined, exibe o ícone genérico de usuário. */
  src?: string | null;
  alt?: string;
  /** Tamanho em px (lado do quadrado). Default 48. */
  size?: number;
  className?: string;
}

/**
 * Avatar do usuário com fallback visual quando não há foto.
 * Em vez de uma "bola cinza", mostra um ícone de pessoa centralizado
 * sobre um fundo neutro do design system.
 */
export function UserAvatar({ src, alt = 'Avatar', size = 48, className }: UserAvatarProps) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={dimension}
        className={cn('rounded-full object-cover', className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      style={dimension}
      className={cn(
        'rounded-full bg-muted flex items-center justify-center text-muted-foreground',
        className,
      )}
    >
      <User size={Math.round(size * 0.55)} strokeWidth={1.75} />
    </div>
  );
}
