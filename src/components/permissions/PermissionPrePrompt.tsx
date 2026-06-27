import { BottomSheet } from "@/components/ui/BottomSheet";

export type PermissionKind = "photos" | "camera" | "location" | "notifications";

const COPY: Record<PermissionKind, { title: string; body: string; icon: string }> = {
  photos: {
    title: "Acesso às suas fotos",
    body:
      "Para você escolher imagens do perfil, capas de roteiros e registros de viagem, precisamos abrir sua galeria. Nada é enviado sem você confirmar.",
    icon: "photo_library",
  },
  camera: {
    title: "Acesso à câmera",
    body:
      "Para tirar uma foto e usá-la no seu perfil, roteiro ou coleção. A foto só é salva quando você confirmar.",
    icon: "photo_camera",
  },
  location: {
    title: "Sua localização",
    body:
      "Usamos sua localização apenas enquanto o mapa está aberto, para centralizar onde você está e sugerir lugares próximos. Não rastreamos em segundo plano.",
    icon: "near_me",
  },
  notifications: {
    title: "Ativar notificações",
    body:
      "Receba avisos sobre convites para roteiros, mensagens e atualizações importantes das suas viagens. Você pode desligar quando quiser nas Configurações.",
    icon: "notifications_active",
  },
};

interface Props {
  open: boolean;
  kind: PermissionKind;
  onAllow: () => void;
  onCancel: () => void;
}

/**
 * Pré-prompt obrigatório antes de pedir a permissão nativa.
 * Atende à App Store Review Guideline 5.1.1: explica o motivo
 * em linguagem clara antes do prompt nativo do iOS aparecer.
 */
export function PermissionPrePrompt({ open, kind, onAllow, onCancel }: Props) {
  const { title, body, icon } = COPY[kind];

  return (
    <BottomSheet open={open} onClose={onCancel}>
      <div className="px-6 pt-6 pb-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#F2F2F2] flex items-center justify-center mb-4">
          <span className="material-symbols-rounded text-[32px] text-[#1A1C40]">{icon}</span>
        </div>
        <h2 className="text-[18px] font-semibold text-[#1A1C40] mb-2">{title}</h2>
        <p className="text-[14px] text-[#5A5C70] leading-relaxed mb-6">{body}</p>

        <button
          type="button"
          onClick={onAllow}
          className="w-full h-12 rounded-full bg-[#1A1C40] text-white text-[15px] font-medium mb-2"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full h-12 rounded-full text-[#1A1C40] text-[15px] font-medium"
        >
          Agora não
        </button>
      </div>
    </BottomSheet>
  );
}
