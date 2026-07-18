import { Icon } from '@/components/ui/Icon';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BackButton } from '@/components/ui/BackButton';
import { useNavigate } from 'react-router-dom';

interface HelpCenterScreenProps {
  onBack: () => void;
  hideTourGuide?: boolean;
}

const faqSections = [
  {
    title: 'Conta',
    items: [
      { q: 'Como altero meus dados pessoais?', a: 'Acesse Perfil > Informações pessoais para editar nome, e-mail, telefone e outros dados.' },
      { q: 'Como excluo minha conta?', a: 'Acesse Perfil > Login e segurança > Excluir minha conta. Antes de excluir, certifique-se de retirar todos os seus valores. Após a exclusão, você não poderá criar uma nova conta por 10 dias.' },
      { q: 'Esqueci minha senha, o que faço?', a: 'Na tela de login, clique em "Esqueci minha senha" e siga as instruções enviadas por e-mail.' },
    ],
  },
  {
    title: 'Roteiros à venda',
    items: [
      { q: 'Como compro um roteiro?', a: 'Navegue até o roteiro desejado, clique em "Comprar" e siga as etapas de pagamento.' },
      { q: 'Posso editar um roteiro comprado?', a: 'Sim! Após a compra, o roteiro aparece nas suas viagens e pode ser personalizado livremente.' },
      { q: 'Como duplico um roteiro gratuito?', a: 'Nos roteiros gratuitos, clique em "Duplicar e usar" para adicionar uma cópia editável às suas viagens. A cópia será colocada nos seus "roteiros privados", ela poderá ser editada por você, mas não poderá ser vendida nem compartilhada.' },
    ],
  },
  {
    title: 'Pagamentos',
    items: [
      { q: 'Quais formas de pagamento são aceitas?', a: 'Aceitamos cartão de crédito/débito e Pix para compras de roteiros.' },
      { q: 'Como recebo pelos meus roteiros vendidos?', a: 'Configure seus dados bancários ou Pix em Perfil > Pagamentos. Os valores são transferidos sempre que solicitados, caso haja um valor mínimo de R$30 reais para retirada.' },
      { q: 'Posso pedir reembolso?', a: 'Sim, em até 7 dias após a compra, entre em contato pelo "Fale conosco" e solicite seu reembolso.' },
    ],
  },
  {
    title: 'Criadores',
    items: [
      { q: 'Como me torno um criador?', a: 'Acesse Perfil > "Torne-se um criador" e siga o processo de cadastro para começar a vender seus roteiros.' },
      { q: 'Qual a comissão da plataforma para venda de roteiros?', a: 'A plataforma retém 10% do valor de cada venda como taxa de serviço.' },
      { q: 'Como acompanho minhas vendas?', a: 'No painel do criador, acesse "Resumo de vendas" para visualizar suas métricas e faturamento.' },
    ],
  },
];

export function HelpCenterScreen({ onBack, hideTourGuide }: HelpCenterScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Central de ajuda
          </h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        {!hideTourGuide && (
          <button
            onClick={() => {
              navigate('/home');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('wai:restart-tour'));
              }, 100);
            }}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Icon name="play_circle" size={22} className="text-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Refazer tour guiado</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Reveja as principais funções do app</p>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-muted-foreground" />
          </button>
        )}


        {faqSections.map(section => (
          <div key={section.title} className="mb-6">
            <h2 className="text-foreground mb-2" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
              {section.title}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {section.items.map((item, idx) => (
                <AccordionItem key={idx} value={`${section.title}-${idx}`} className="border-b border-border/50">
                  <AccordionTrigger className="text-left hover:no-underline" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-sm)' }}>{item.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </div>
  );
}
