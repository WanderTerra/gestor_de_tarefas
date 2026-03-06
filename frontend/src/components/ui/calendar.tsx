import 'react-day-picker/dist/style.css';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import * as ptBRModule from 'date-fns/locale/pt-BR';

// date-fns v3 exports locale as default in runtime
const ptBR = (ptBRModule as any).default || ptBRModule;
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn('rdp-root p-3', className)}
      style={{ '--rdp-accent-color': '#059669', '--rdp-accent-background-color': '#d1fae5' } as React.CSSProperties}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
