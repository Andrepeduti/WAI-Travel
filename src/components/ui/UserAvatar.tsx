import { cn } from '@/lib/utils';

const defaultAvatarUrl = '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png';

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
    <img
      src={defaultAvatarUrl}
      alt={alt}
      style={dimension}
      className={cn('rounded-full object-cover bg-[#E2EECE]', className)}
    />
  );
}
