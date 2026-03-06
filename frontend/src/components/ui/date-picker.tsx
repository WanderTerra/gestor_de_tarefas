import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Converte "dd/MM/yyyy" para Date ou undefined */
function parseBRDate(value: string): Date | undefined {
  if (!value || value.length !== 10) return undefined;
  const parts = value.split('/');
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const date = new Date(y, m - 1, d);
  if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y) return undefined;
  return date;
}

/** Converte Date para "dd/MM/yyyy" */
function formatBRDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, placeholder = 'dd/mm/aaaa', className, inputClassName, disabled }, ref) => {
    const [open, setOpen] = React.useState(false);
    const date = parseBRDate(value);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal h-9 pl-3 pr-4 min-w-[8.5rem]',
              !value && 'text-slate-500',
              inputClassName,
              className
            )}
            style={{
              background: '#fff',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            }}
          >
            <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
            {value ? value : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selected) => {
              if (selected) {
                onChange(formatBRDate(selected));
                setOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }
);
DatePicker.displayName = 'DatePicker';

export { DatePicker, parseBRDate, formatBRDate };
