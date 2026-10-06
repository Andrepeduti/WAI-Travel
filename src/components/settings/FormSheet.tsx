import type { ReactNode } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface FormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Bottom sheet padrão para formulários curtos das configurações. */
export function FormSheet({ open, onOpenChange, title, description, children }: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[20px] px-5 pb-[34px] pt-3 w-full mx-auto">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: 'hsl(var(--divider))' }} />
        </div>
        <h2 className="text-foreground mb-1" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mb-5" style={{ fontSize: 'var(--text-sm)' }}>
            {description}
          </p>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}

export function FormField({ label, value, onChange, type = 'text', placeholder, autoComplete }: FormFieldProps) {
  return (
    <div>
      <label className="block text-muted-foreground mb-1.5" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete ?? 'off'}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
        style={{ fontSize: 'var(--text-base)' }}
      />
    </div>
  );
}
