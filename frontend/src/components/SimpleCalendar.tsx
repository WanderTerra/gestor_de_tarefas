import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SimpleCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  dayOfMonthMode?: boolean; // Se true, destaca o dia do mês em todos os meses
}

const SimpleCalendar: React.FC<SimpleCalendarProps> = ({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  dayOfMonthMode = false,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateDisabled = (date: Date): boolean => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (minDate) {
      const minDateOnly = new Date(minDate);
      minDateOnly.setHours(0, 0, 0, 0);
      if (dateOnly < minDateOnly) return true;
    }
    
    if (maxDate) {
      const maxDateOnly = new Date(maxDate);
      maxDateOnly.setHours(0, 0, 0, 0);
      if (dateOnly > maxDateOnly) return true;
    }
    
    return false;
  };

  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    
    // Se estiver no modo "dia do mês", comparar apenas o dia do mês
    if (dayOfMonthMode) {
      return date.getDate() === selectedDate.getDate();
    }
    
    // Caso contrário, comparar a data completa
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const selectedOnly = new Date(selectedDate);
    selectedOnly.setHours(0, 0, 0, 0);
    return dateOnly.getTime() === selectedOnly.getTime();
  };

  const isToday = (date: Date): boolean => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly.getTime() === today.getTime();
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!isDateDisabled(date)) {
      onDateSelect(date);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days: (number | null)[] = [];

  // Preencher com nulls para os dias antes do primeiro dia do mês
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Preencher com os dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="w-full">
      {/* Cabeçalho do calendário */}
      <div className="flex items-center justify-between mb-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevMonth}
          className="h-6 w-6"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <h3 className="text-sm font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-6 w-6"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-muted-foreground py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const disabled = isDateDisabled(date);
          const selected = isDateSelected(date);
          const todayDate = isToday(date);
          const isSunday = date.getDay() === 0;

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={disabled}
              className={`
                aspect-square rounded text-[11px] font-medium transition-colors p-0
                ${disabled
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : selected
                  ? 'bg-primary text-primary-foreground'
                  : todayDate
                  ? 'bg-primary/20 text-primary font-bold'
                  : isSunday
                  ? 'text-muted-foreground/50'
                  : 'hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleCalendar;
