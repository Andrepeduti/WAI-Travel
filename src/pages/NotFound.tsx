import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleReturn = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home", { replace: true });
    }
  };

  return (
    <div
      className="fixed inset-0 left-1/2 -translate-x-1/2 w-full w-full flex flex-col items-center justify-center px-6"
      style={{ height: "100dvh", backgroundColor: "#F2F2F2" }}
    >
      {/* Ícone ilustrativo */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{ background: "rgba(157, 204, 54, 0.15)" }}
      >
        <Icon name="map" size={44} style={{ color: "#1A1C40" }} />
      </div>

      {/* Código de erro */}
      <p
        className="text-[13px] font-semibold tracking-[0.2em] uppercase mb-2"
        style={{ color: "#9DCC36" }}
      >
        Erro 404
      </p>

      {/* Título */}
      <h1
        className="text-[24px] font-bold text-center leading-tight mb-3"
        style={{ color: "#1A1C40" }}
      >
        Essa área do mundo ainda não foi explorada
      </h1>

      {/* Subtítulo */}
      <p className="text-[14px] text-center text-muted-foreground mb-8 max-w-[320px]">
        Parece que esse destino saiu do mapa. Que tal voltar e seguir por outro caminho?
      </p>

      {/* Botão de retorno */}
      <button
        onClick={handleReturn}
        className="h-12 px-8 rounded-full font-semibold text-[15px] active:scale-[0.98] transition-transform inline-flex items-center gap-2"
        style={{ backgroundColor: "#1A1C40", color: "#FFFFFF" }}
      >
        <Icon name="chevron_left" size={18} className="text-white" />
        Retornar
      </button>
    </div>
  );
};

export default NotFound;
