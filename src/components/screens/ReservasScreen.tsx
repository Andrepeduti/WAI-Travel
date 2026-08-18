import React, { useState, useMemo } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { LuggageIllustration } from '@/components/travel/reservas/LuggageIllustration';
import {
  ReservaTypePickerSheet,
  ReservaTipoChoice,
} from '@/components/travel/reservas/ReservaTypePickerSheet';
import { AddHospedagemForm } from '@/components/travel/reservas/AddHospedagemForm';
import { AddTransporteForm } from '@/components/travel/reservas/AddTransporteForm';
import { AddAtividadeForm } from '@/components/travel/reservas/AddAtividadeForm';
import {
  ReservaCard,
  UnifiedReservaItem,
} from '@/components/travel/reservas/ReservaCard';
import type { Reserva } from '@/components/travel/AddReservaSheet';
import type { Transporte } from '@/components/travel/AddTransporteSheet';
import type { SplitPerson } from '@/components/travel/reservas/SplitExpenseSheet';

export interface ReservasScreenProps {
  onBack: () => void;
  reservas?: Reserva[];
  onReservasChange?: (reservas: Reserva[]) => void;
  transportes?: Transporte[];
  onTransportesChange?: (transportes: Transporte[]) => void;
  splitPeople?: SplitPerson[];
}

export function ReservasScreen({
  onBack,
  reservas: externalReservas,
  onReservasChange,
  transportes: externalTransportes,
  onTransportesChange,
  splitPeople,
}: ReservasScreenProps) {
  // Internal fallback state if not externally managed
  const [internalReservas, setInternalReservas] = useState<Reserva[]>([]);
  const [internalTransportes, setInternalTransportes] = useState<Transporte[]>([]);

  const reservas = externalReservas ?? internalReservas;
  const transportes = externalTransportes ?? internalTransportes;

  const setReservas = (updater: Reserva[] | ((prev: Reserva[]) => Reserva[])) => {
    const newVal = typeof updater === 'function' ? updater(reservas) : updater;
    if (onReservasChange) onReservasChange(newVal);
    else setInternalReservas(newVal);
  };

  const setTransportes = (updater: Transporte[] | ((prev: Transporte[]) => Transporte[])) => {
    const newVal = typeof updater === 'function' ? updater(transportes) : updater;
    if (onTransportesChange) onTransportesChange(newVal);
    else setInternalTransportes(newVal);
  };

  // Flow State
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [activeFormType, setActiveFormType] = useState<ReservaTipoChoice | null>(null);

  // Edit / Delete State
  const [editingItem, setEditingItem] = useState<UnifiedReservaItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<UnifiedReservaItem | null>(null);

  // Feedback Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState({ title: '', description: '' });

  // Unify and sort items
  const unifiedItems: UnifiedReservaItem[] = useMemo(() => {
    const items: UnifiedReservaItem[] = [];

    // Add transportes
    for (const t of transportes) {
      items.push({
        kind: 'transporte',
        id: `t-${t.id}`,
        data: t,
      });
    }

    // Add reservas (hospedagem & atividade)
    for (const r of reservas) {
      items.push({
        kind: r.tipo === 'hospedagem' ? 'hospedagem' : 'atividade',
        id: `r-${r.id}`,
        data: r,
      });
    }

    // Sort chronologically by date
    items.sort((a, b) => {
      const getDate = (item: UnifiedReservaItem): number => {
        if (item.kind === 'transporte') {
          return item.data.partidaDate ? new Date(item.data.partidaDate).getTime() : 0;
        }
        if (item.kind === 'hospedagem') {
          return item.data.checkInDate ? new Date(item.data.checkInDate).getTime() : 0;
        }
        return item.data.atividadeDate ? new Date(item.data.atividadeDate).getTime() : 0;
      };

      const dateA = getDate(a);
      const dateB = getDate(b);

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB;
    });

    return items;
  }, [transportes, reservas]);

  // Handlers for Add / Edit
  const handleOpenTypePicker = () => {
    setEditingItem(null);
    setShowTypePicker(true);
  };

  const handleTypeSelected = (selectedType: ReservaTipoChoice) => {
    setShowTypePicker(false);
    setActiveFormType(selectedType);
  };

  const handleSaveHospedagem = (reserva: Reserva) => {
    if (editingItem && editingItem.kind === 'hospedagem') {
      setReservas((prev) => prev.map((r) => (r.id === reserva.id ? reserva : r)));
      setToastMsg({ title: 'Hospedagem atualizada!', description: 'Alterações salvas com sucesso ✨' });
    } else {
      setReservas((prev) => [...prev, reserva]);
      setToastMsg({ title: 'Hospedagem adicionada!', description: 'Sua reserva foi salva com sucesso ✨' });
    }
    setActiveFormType(null);
    setEditingItem(null);
    setTimeout(() => setShowToast(true), 250);
  };

  const handleSaveTransporte = (transporte: Transporte) => {
    if (editingItem && editingItem.kind === 'transporte') {
      setTransportes((prev) => prev.map((t) => (t.id === transporte.id ? transporte : t)));
      setToastMsg({ title: 'Transporte atualizado!', description: 'Alterações salvas com sucesso ✨' });
    } else {
      setTransportes((prev) => [...prev, transporte]);
      setToastMsg({ title: 'Transporte adicionado!', description: 'Sua reserva foi salva com sucesso ✨' });
    }
    setActiveFormType(null);
    setEditingItem(null);
    setTimeout(() => setShowToast(true), 250);
  };

  const handleSaveAtividade = (reserva: Reserva) => {
    if (editingItem && editingItem.kind === 'atividade') {
      setReservas((prev) => prev.map((r) => (r.id === reserva.id ? reserva : r)));
      setToastMsg({ title: 'Atividade atualizada!', description: 'Alterações salvas com sucesso ✨' });
    } else {
      setReservas((prev) => [...prev, reserva]);
      setToastMsg({ title: 'Atividade adicionada!', description: 'Sua reserva foi salva com sucesso ✨' });
    }
    setActiveFormType(null);
    setEditingItem(null);
    setTimeout(() => setShowToast(true), 250);
  };

  const handleEditCard = (item: UnifiedReservaItem) => {
    setEditingItem(item);
    setActiveFormType(item.kind);
  };

  const handleDeleteCard = (item: UnifiedReservaItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.kind === 'transporte') {
      const t = itemToDelete.data as Transporte;
      setTransportes((prev) => prev.filter((x) => x.id !== t.id));
    } else {
      const r = itemToDelete.data as Reserva;
      setReservas((prev) => prev.filter((x) => x.id !== r.id));
    }

    setItemToDelete(null);
    setToastMsg({ title: 'Item excluído', description: 'A reserva foi removida com sucesso' });
    setTimeout(() => setShowToast(true), 200);
  };

  const handleBackToTypePicker = () => {
    setActiveFormType(null);
    if (!editingItem) {
      setShowTypePicker(true);
    }
  };

  const isEmpty = unifiedItems.length === 0;

  return (
    <div
      className="min-h-screen bg-[#F3F3F3] flex flex-col relative"
      style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
    >
      {/* Header (Figma specs: bg #F3F3F3, gap 16px, title 20px bold #171F2C) */}
      <header className="sticky top-0 z-20 bg-[#F3F3F3] px-6 pt-5 pb-3">
        <div
          className="flex items-center gap-4"
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 8px)' }}
        >
          <BackButton onClick={onBack} />
          <h1 className="font-['Urbanist'] font-bold text-[20px] leading-[24px] text-[#171F2C] my-0">
            Reservas
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      {isEmpty ? (
        /* Empty State (Exact Figma CSS values: 345px width, 119x113.32px group, #171F2C 18px, #7F7F7F 14px, #9DCC36 195x48px button) */
        <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-12 text-center">
          <div className="w-full max-w-[345px] flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-4">
              {/* Group 481513: 119px x 113.32px */}
              <LuggageIllustration width={119} height={113} />

              {/* Frame 1321316333 */}
              <div className="flex flex-col items-center gap-2 max-w-[293px]">
                <h2 className="font-['Urbanist'] font-semibold text-[18px] leading-[22px] text-[#171F2C] my-0">
                  Nenhuma reserva adicionada
                </h2>

                <p className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#7F7F7F] my-0">
                  Adicione suas reservas para ter tudo da viagem em um só lugar.
                </p>
              </div>
            </div>

            {/* Main Button: 195px x 48px, #9DCC36, radius 16px */}
            <button
              onClick={handleOpenTypePicker}
              className="w-[195px] h-[48px] px-6 rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.98] transition-all flex items-center justify-center"
            >
              Adicionar documento
            </button>
          </div>
        </main>
      ) : (
        /* Filled State (Figma Frame 1321316138 / image_5a2703.png: padding 0px 24px 24px, gap 16px) */
        <main className="flex-1 overflow-y-auto px-6 pt-2 pb-28 space-y-4 max-w-[393px] mx-auto w-full">
          {unifiedItems.map((item) => (
            <ReservaCard
              key={item.id}
              item={item}
              onClick={handleEditCard}
              onEdit={handleEditCard}
              onDelete={handleDeleteCard}
            />
          ))}
        </main>
      )}

      {/* Fixed Bottom Button (Figma: width 345px, height 48px, bg #9DCC36, radius 16px, 16px bold #141530) */}
      {!isEmpty && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#F3F3F3] via-[#F3F3F3]/90 to-transparent pt-4 pb-6 px-6 flex justify-center pointer-events-none">
          <div className="w-full max-w-[345px] safe-bottom pointer-events-auto">
            <button
              onClick={handleOpenTypePicker}
              className="w-full h-[48px] rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.99] transition-all flex items-center justify-center"
            >
              Adicionar reserva
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sheet 1: Type Picker (image_5a2743.png) */}
      <ReservaTypePickerSheet
        isOpen={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        onContinue={handleTypeSelected}
      />

      {/* Bottom Sheet 2: Hospedagem Form (image_5a273d.png) */}
      <AddHospedagemForm
        isOpen={activeFormType === 'hospedagem'}
        onClose={() => {
          setActiveFormType(null);
          setEditingItem(null);
        }}
        onBack={editingItem ? undefined : handleBackToTypePicker}
        onSave={handleSaveHospedagem}
        editingReserva={
          editingItem && editingItem.kind === 'hospedagem'
            ? (editingItem.data as Reserva)
            : null
        }
        splitPeople={splitPeople}
      />

      {/* Bottom Sheet 3: Transporte Form (image_5a271f.png - Left) */}
      <AddTransporteForm
        isOpen={activeFormType === 'transporte'}
        onClose={() => {
          setActiveFormType(null);
          setEditingItem(null);
        }}
        onBack={editingItem ? undefined : handleBackToTypePicker}
        onSave={handleSaveTransporte}
        editingTransporte={
          editingItem && editingItem.kind === 'transporte'
            ? (editingItem.data as Transporte)
            : null
        }
        splitPeople={splitPeople}
      />

      {/* Bottom Sheet 4: Atividade Form (image_5a271f.png - Right) */}
      <AddAtividadeForm
        isOpen={activeFormType === 'atividade'}
        onClose={() => {
          setActiveFormType(null);
          setEditingItem(null);
        }}
        onBack={editingItem ? undefined : handleBackToTypePicker}
        onSave={handleSaveAtividade}
        editingReserva={
          editingItem && editingItem.kind === 'atividade'
            ? (editingItem.data as Reserva)
            : null
        }
        splitPeople={splitPeople}
      />

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[120] animate-in fade-in duration-200"
            onClick={() => setItemToDelete(null)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[130] flex justify-center pointer-events-none"
            style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
          >
            <div className="bg-background rounded-t-[32px] w-full max-w-lg p-6 pb-8 pointer-events-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
              <h3 className="text-[18px] font-bold text-[#141530] mb-2">
                Excluir reserva?
              </h3>
              <p className="text-[14px] text-muted-foreground mb-6">
                Essa ação não pode ser desfeita. O item será removido permanentemente.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="w-full py-4 rounded-2xl bg-destructive text-destructive-foreground text-[15px] font-bold shadow-sm"
                >
                  Excluir reserva
                </button>
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="w-full py-4 rounded-2xl border border-border text-[15px] font-bold text-[#141530]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Success Toast */}
      <SuccessToast
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        title={toastMsg.title}
        description={toastMsg.description}
      />
    </div>
  );
}
