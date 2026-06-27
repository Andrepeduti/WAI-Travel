import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation, type CaptionProps } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /**
   * Quando `true`, renderiza o calendário em layout vertical com múltiplos
   * meses empilhados e scroll contínuo — padrão usado por Airbnb e Booking
   * para reservas de viagem. Ideal para datas que podem estar próximas OU
   * meses no futuro: o usuário rola livremente sem precisar ficar clicando
   * em setas.
   *
   * Quando `false` (default), mantém o layout tradicional de um único mês
   * com setas de navegação — adequado para campos onde o usuário tipicamente
   * escolhe uma data próxima (ex: data de nascimento via dropdowns).
   */
  scrollable?: boolean;
  /** Quantidade de meses exibidos quando `scrollable` está ativo. Default: 14. */
  scrollableMonths?: number;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  scrollable = false,
  scrollableMonths = 14,
  ...props
}: CalendarProps) {
  const currentYear = new Date().getFullYear();

  // Layout vertical estilo Airbnb / Booking: scroll contínuo de meses.
  // Funciona bem tanto para datas próximas (mês atual no topo) quanto
  // distantes (basta rolar a lista). Sem setas, sem dropdowns.
  if (scrollable) {
    return (
      <div className={cn("max-h-[60vh] overflow-y-auto pointer-events-auto", className)}>
        <DayPicker
          showOutsideDays={false}
          locale={ptBR}
          numberOfMonths={scrollableMonths}
          pagedNavigation={false}
          className="p-4"
          classNames={{
            months: "flex flex-col gap-6",
            month: "space-y-3",
            caption: "flex justify-start pt-1 px-1 items-center",
            caption_label: "text-[15px] font-bold text-foreground capitalize",
            // Esconde a navegação por setas — o scroll é a navegação principal.
            nav: "hidden",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell:
              "text-muted-foreground w-9 font-normal text-[0.75rem] lowercase",
            row: "flex w-full mt-1",
            cell: cn(
              "relative h-9 w-9 text-center text-sm p-0 focus-within:relative focus-within:z-20",
              "[&:has([aria-selected])]:bg-primary-official/20",
              "[&:has([aria-selected].day-range-start)]:rounded-l-full",
              "[&:has([aria-selected].day-range-end)]:rounded-r-full",
              "[&:has([aria-selected].day-range-start.day-range-end)]:rounded-full",
            ),
            day: cn(
              "h-9 w-9 p-0 font-normal inline-flex items-center justify-center transition-colors",
              "hover:bg-muted rounded-full aria-selected:opacity-100",
            ),
            day_range_start:
              "day-range-start !bg-primary-official !text-[#1A1C40] rounded-full hover:!bg-primary-official focus:!bg-primary-official",
            day_range_end:
              "day-range-end !bg-primary-official !text-[#1A1C40] rounded-full hover:!bg-primary-official focus:!bg-primary-official",
            day_selected:
              "!bg-primary-official !text-[#1A1C40] rounded-full hover:!bg-primary-official focus:!bg-primary-official",
            day_today:
              "bg-[#141530] text-white rounded-full hover:bg-[#141530] focus:bg-[#141530] aria-selected:!bg-primary-official aria-selected:!text-white",
            day_outside:
              "day-outside text-muted-foreground opacity-50 aria-selected:!bg-primary-official/20 aria-selected:!text-muted-foreground",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle:
              "day-range-middle !bg-transparent !text-foreground !rounded-none",
            day_hidden: "invisible",
            ...classNames,
          }}
          {...props}
        />
      </div>
    );
  }

  // Caption customizada: dropdowns de mês/ano + chevrons laterais para
  // navegação com 1 clique (avançar/retroceder mês). Sem chevron de "próximo
  // ano" — só retroceder ano fica acessível via dropdown.
  const fromYear = currentYear - 5;
  const toYear = currentYear + 10;

  function CustomCaption({ displayMonth }: CaptionProps) {
    const { goToMonth } = useNavigation();
    const month = displayMonth.getMonth();
    const year = displayMonth.getFullYear();

    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
    ];
    const years: number[] = [];
    for (let y = fromYear; y <= toYear; y++) years.push(y);

    const prevMonth = new Date(year, month - 1, 1);
    const nextMonth = new Date(year, month + 1, 1);
    const canGoPrev = prevMonth.getFullYear() >= fromYear;
    const canGoNext = nextMonth.getFullYear() <= toYear;

    const dropdownClass = cn(
      "appearance-none bg-muted hover:bg-muted/80 text-foreground text-sm font-medium",
      "rounded-lg px-2.5 py-1.5 pr-7 cursor-pointer transition-colors",
      "border-0 focus:outline-none focus:ring-2 focus:ring-primary/30",
    );
    const chevronBtn = cn(
      "h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors",
      "hover:bg-muted text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed",
    );

    return (
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={!canGoPrev}
          onClick={() => goToMonth(prevMonth)}
          className={chevronBtn}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <select
            value={month}
            onChange={(e) => goToMonth(new Date(year, Number(e.target.value), 1))}
            className={cn(dropdownClass, "capitalize")}
            aria-label="Mês"
          >
            {months.map((m, i) => (
              <option key={m} value={i} className="capitalize">{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => goToMonth(new Date(Number(e.target.value), month, 1))}
            className={dropdownClass}
            aria-label="Ano"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          aria-label="Próximo mês"
          disabled={!canGoNext}
          onClick={() => goToMonth(nextMonth)}
          className={chevronBtn}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Layout tradicional (default): um mês de cada vez, dropdowns de mês/ano
  // com chevrons laterais para avançar/retroceder rapidamente.
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ptBR}
      fromYear={fromYear}
      toYear={toYear}
      className={cn("p-4 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "hidden",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground w-9 font-normal text-[0.75rem] lowercase",
        row: "flex w-full mt-1",
        cell: cn(
          "relative h-9 w-9 text-center text-sm p-0 focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-primary-official/20",
          "[&:has([aria-selected].day-range-start)]:rounded-l-full",
          "[&:has([aria-selected].day-range-end)]:rounded-r-full",
          "[&:has([aria-selected].day-range-start.day-range-end)]:rounded-full"
        ),
        day: cn(
          "h-9 w-9 p-0 font-normal inline-flex items-center justify-center transition-colors",
          "hover:bg-muted rounded-full aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start !bg-primary-official !text-[#1A1C40] rounded-full hover:!bg-primary-official focus:!bg-primary-official",
        day_range_end: "day-range-end !bg-primary-official !text-[#1A1C40] rounded-full hover:!bg-primary-official focus:!bg-primary-official",
        day_selected:
          "!bg-primary-official !text-[#1A1C40] rounded-full hover:!bg-primary-official focus:!bg-primary-official",
        day_today:
          "bg-[#141530] text-white rounded-full hover:bg-[#141530] focus:bg-[#141530] aria-selected:!bg-primary-official aria-selected:!text-white",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:!bg-primary-official/20 aria-selected:!text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "day-range-middle !bg-transparent !text-foreground !rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CustomCaption,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
