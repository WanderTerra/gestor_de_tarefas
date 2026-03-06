import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import SimpleCalendar from './SimpleCalendar';
import type { User } from '@/types/user';

interface CreateTaskWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskData: {
    name: string;
    description: string;
    isRecurring: boolean;
    recurringDays?: string[];
    recurringDayOfMonth?: number;
    deadline?: string;
    timeLimit?: string;
    estimatedTime?: number;
    tutorialLink?: string;
    assignedToId?: number;
  }) => Promise<void>;
  employees: User[];
  isManager: boolean;
  saving: boolean;
}

type WizardStep = 'name' | 'type' | 'recurring-day' | 'recurring-weekdays' | 'single-date' | 'time-limit' | 'estimated-time' | 'tutorial-link';

const CreateTaskWizard: React.FC<CreateTaskWizardProps> = ({
  open,
  onOpenChange,
  onSave,
  employees,
  isManager,
  saving,
}) => {
  const [step, setStep] = useState<WizardStep>('name');
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskType, setTaskType] = useState<'recurring' | 'single' | null>(null);
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState<number | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeLimit, setTimeLimit] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [tutorialLink, setTutorialLink] = useState<string>('');
  const [assignToId, setAssignToId] = useState<string>('');

  const daysOfWeek = [
    { id: 'seg', label: 'Segunda' },
    { id: 'ter', label: 'Terça' },
    { id: 'qua', label: 'Quarta' },
    { id: 'qui', label: 'Quinta' },
    { id: 'sex', label: 'Sexta' },
    { id: 'sab', label: 'Sábado' },
  ];

  const resetWizard = () => {
    setStep('name');
    setTaskName('');
    setTaskDescription('');
    setTaskType(null);
    setRecurringDayOfMonth(null);
    setSelectedWeekdays([]);
    setSelectedDate(null);
    setTimeLimit('');
    setEstimatedTime('');
    setTutorialLink('');
    setAssignToId('');
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetWizard();
    }
    onOpenChange(open);
  };

  const handleNext = () => {
    if (step === 'name') {
      if (!taskName.trim()) return;
      setStep('type');
    } else if (step === 'type') {
      if (!taskType) return;
      if (taskType === 'recurring') {
        setStep('recurring-day');
      } else {
        setStep('single-date');
      }
    } else if (step === 'recurring-day') {
      if (recurringDayOfMonth === null) return;
      setStep('recurring-weekdays');
    } else if (step === 'recurring-weekdays') {
      if (selectedWeekdays.length === 0) return;
      setStep('time-limit');
    } else if (step === 'single-date') {
      if (!selectedDate) return;
      setStep('time-limit');
    } else if (step === 'time-limit') {
      if (!timeLimit.trim()) return;
      setStep('estimated-time');
    } else if (step === 'estimated-time') {
      setStep('tutorial-link');
    } else if (step === 'tutorial-link') {
      // Próximo passo seria salvar, mas isso é feito no handleSave
    }
  };

  const handleBack = () => {
    if (step === 'type') {
      setStep('name');
    } else if (step === 'recurring-day' || step === 'single-date') {
      setStep('type');
    } else if (step === 'recurring-weekdays') {
      setStep('recurring-day');
    } else if (step === 'time-limit') {
      // Voltar para o passo anterior baseado no tipo de tarefa
      if (taskType === 'recurring') {
        setStep('recurring-weekdays');
      } else {
        setStep('single-date');
      }
    } else if (step === 'estimated-time') {
      setStep('time-limit');
    } else if (step === 'tutorial-link') {
      setStep('estimated-time');
    }
  };

  const handleSave = async () => {
    if (step !== 'tutorial-link') return;
    
    // Validar campos obrigatórios anteriores
    if (!timeLimit.trim()) return;
    if (taskType === 'recurring' && selectedWeekdays.length === 0) return;
    if (taskType === 'single' && !selectedDate) return;
    
    // Tempo estimado é obrigatório
    if (!estimatedTime.trim()) return;
    const estimatedTimeMinutes = parseInt(estimatedTime.trim(), 10);
    if (isNaN(estimatedTimeMinutes) || estimatedTimeMinutes <= 0) return;

    // Validar e limpar link do tutorial
    const tutorialLinkValue = tutorialLink.trim() || undefined;

    if (taskType === 'recurring') {
      // Lógica: se for um dia só do mês, excluir domingo dos dias da semana
      let finalWeekdays = [...selectedWeekdays];
      if (recurringDayOfMonth !== null) {
        finalWeekdays = finalWeekdays.filter(day => day !== 'dom');
      }

      await onSave({
        name: taskName,
        description: taskDescription,
        isRecurring: true,
        recurringDays: finalWeekdays, // Array de strings
        recurringDayOfMonth: recurringDayOfMonth || undefined,
        timeLimit: timeLimit,
        estimatedTime: estimatedTimeMinutes,
        tutorialLink: tutorialLinkValue,
        assignedToId: assignToId ? Number(assignToId) : undefined,
      });
    } else {
      // Converter para datetime ISO completo (backend espera datetime, não apenas data)
      const deadline = selectedDate.toISOString();
      
      await onSave({
        name: taskName,
        description: taskDescription,
        isRecurring: false,
        deadline,
        timeLimit: timeLimit,
        estimatedTime: estimatedTimeMinutes,
        tutorialLink: tutorialLinkValue,
        assignedToId: assignToId ? Number(assignToId) : undefined,
      });
    }
    
    resetWizard();
    onOpenChange(false);
  };

  const toggleWeekday = (day: string) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const canProceed = () => {
    if (step === 'name') return taskName.trim().length > 0;
    if (step === 'type') return taskType !== null;
    if (step === 'recurring-day') return recurringDayOfMonth !== null;
    if (step === 'recurring-weekdays') return selectedWeekdays.length > 0;
    if (step === 'single-date') return selectedDate !== null;
    if (step === 'time-limit') return timeLimit.trim().length > 0;
    if (step === 'estimated-time') {
      // Tempo estimado é obrigatório
      const minutes = estimatedTime.trim() ? parseInt(estimatedTime.trim(), 10) : 0;
      return !isNaN(minutes) && minutes > 0;
    }
    if (step === 'tutorial-link') return true; // Opcional, sempre pode avançar
    return false;
  };

  const renderStepContent = () => {
    switch (step) {
      case 'name':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Tarefa *</label>
              <Input
                placeholder="Digite o nome da tarefa"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canProceed() && handleNext()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Input
                placeholder="Breve descrição da tarefa"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canProceed() && handleNext()}
              />
            </div>
            {isManager && employees.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Atribuir a</label>
                <Select value={assignToId} onValueChange={setAssignToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      case 'type':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setTaskType('recurring');
                  // Avançar automaticamente para o próximo passo
                  setTimeout(() => {
                    setStep('recurring-day');
                  }, 100);
                }}
                className={`
                  p-6 rounded-lg border-2 transition-all
                  ${taskType === 'recurring'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🔁</div>
                  <div className="font-semibold">Recorrente</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Repete periodicamente
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaskType('single');
                  // Avançar automaticamente para o próximo passo
                  setTimeout(() => {
                    setStep('single-date');
                  }, 100);
                }}
                className={`
                  p-6 rounded-lg border-2 transition-all
                  ${taskType === 'single'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📅</div>
                  <div className="font-semibold">Única</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Acontece uma vez
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case 'recurring-day':
        // Criar uma data temporária para o calendário baseada no dia selecionado
        const getSelectedDateForCalendar = (): Date | null => {
          if (recurringDayOfMonth === null) return null;
          const now = new Date();
          // Usar o mês atual e o dia selecionado
          return new Date(now.getFullYear(), now.getMonth(), recurringDayOfMonth);
        };

        const handleDaySelect = (date: Date) => {
          // Extrair apenas o dia do mês (1-31)
          const dayOfMonth = date.getDate();
          setRecurringDayOfMonth(dayOfMonth);
        };

        return (
          <div className="space-y-1">
            <SimpleCalendar
              selectedDate={getSelectedDateForCalendar()}
              onDateSelect={handleDaySelect}
              dayOfMonthMode={true}
            />
          </div>
        );

      case 'recurring-weekdays':
        return (
          <div className="space-y-4">
            {recurringDayOfMonth !== null && (
              <p className="text-xs text-orange-600 mb-2">
                Nota: Domingos serão automaticamente excluídos para tarefas mensais.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {daysOfWeek.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleWeekday(day.id)}
                  className={`
                    px-4 py-3 text-sm font-medium rounded-md transition-colors
                    ${selectedWeekdays.includes(day.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'single-date':
        return (
          <div className="space-y-1">
            <SimpleCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              minDate={new Date()}
            />
          </div>
        );

      case 'time-limit':
        const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          let value = e.target.value;
          
          // Remover qualquer caractere que não seja número ou :
          value = value.replace(/[^\d:]/g, '');
          
          // Limitar a 5 caracteres (HH:MM)
          if (value.length > 5) {
            value = value.substring(0, 5);
          }
          
          // Adicionar : automaticamente após 2 dígitos (se não tiver ainda)
          if (value.length === 2 && !value.includes(':')) {
            value = value + ':';
          }
          
          // Permitir digitação incremental
          // Aceita: vazio, 1-2 dígitos, 1-2 dígitos + :, 1-2 dígitos + : + 1-2 dígitos
          const isValidFormat = 
            value === '' ||
            /^\d{1,2}$/.test(value) ||  // Apenas horas (1 ou 2 dígitos)
            /^\d{1,2}:$/.test(value) ||  // Horas + :
            /^\d{1,2}:\d{1,2}$/.test(value); // Horas + : + minutos (1 ou 2 dígitos)
          
          if (isValidFormat) {
            // Validar valores enquanto digita
            const parts = value.split(':');
            if (parts.length === 1 && parts[0]) {
              // Apenas horas digitadas - permitir enquanto digita
              const hours = parseInt(parts[0]);
              if (parts[0].length < 2 || hours <= 23) {
                setTimeLimit(value);
              }
            } else if (parts.length === 2) {
              // Horas e minutos
              const hours = parseInt(parts[0]) || 0;
              const minutesStr = parts[1] || '';
              
              // Validar horas (0-23) - permitir enquanto digita
              const hoursValid = parts[0].length < 2 || hours <= 23;
              
              if (hoursValid) {
                // Para minutos, permitir digitação incremental
                if (minutesStr.length === 0) {
                  // Ainda não digitou minutos
                  setTimeLimit(value);
                } else if (minutesStr.length === 1) {
                  // Digitando primeiro dígito dos minutos (0-5)
                  const firstDigit = parseInt(minutesStr);
                  if (firstDigit <= 5) {
                    setTimeLimit(value);
                  }
                } else if (minutesStr.length === 2) {
                  // Dois dígitos dos minutos - validar se <= 59
                  const minutes = parseInt(minutesStr);
                  if (minutes <= 59) {
                    setTimeLimit(value);
                  }
                }
              }
            } else {
              setTimeLimit(value);
            }
          }
        };

        const handleTimeBlur = () => {
          // Validar e formatar ao perder o foco
          if (timeLimit) {
            const parts = timeLimit.split(':');
            if (parts.length === 2) {
              let hours = parseInt(parts[0]) || 0;
              let minutes = parseInt(parts[1]) || 0;
              
              // Garantir valores válidos
              if (hours > 23) hours = 23;
              if (minutes > 59) minutes = 59;
              
              // Formatar com zeros à esquerda
              const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
              setTimeLimit(formatted);
            } else if (parts.length === 1 && parts[0]) {
              // Se só tem horas, adicionar :00
              let hours = parseInt(parts[0]) || 0;
              if (hours > 23) hours = 23;
              setTimeLimit(`${String(hours).padStart(2, '0')}:00`);
            }
          }
        };

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                value={timeLimit}
                onChange={handleTimeChange}
                onBlur={handleTimeBlur}
                autoFocus
                placeholder="16:00"
                maxLength={5}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-lg"
                style={{ 
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Este horário é obrigatório e será usado para controlar o prazo de execução da tarefa.
              <span className="block mt-1">Formato: 24 horas (ex: 16:00)</span>
            </p>
          </div>
        );

      case 'estimated-time':
        const handleEstimatedTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          let value = e.target.value;
          // Permitir apenas números
          value = value.replace(/\D/g, '');
          // Limitar a um número razoável (ex: 9999 minutos = ~166 horas)
          if (value && parseInt(value, 10) > 9999) {
            value = '9999';
          }
          setEstimatedTime(value);
        };

        const handleEstimatedTimeBlur = () => {
          if (estimatedTime.trim()) {
            const num = parseInt(estimatedTime.trim(), 10);
            if (isNaN(num) || num <= 0) {
              setEstimatedTime('');
            } else {
              setEstimatedTime(String(num));
            }
          }
        };

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                value={estimatedTime}
                onChange={handleEstimatedTimeChange}
                onBlur={handleEstimatedTimeBlur}
                autoFocus
                placeholder="Ex: 30"
                maxLength={4}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-lg"
                style={{ 
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace',
                  background: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: `
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                    0 0 0 1px rgba(255, 255, 255, 0.2),
                    0 0 10px rgba(255, 255, 255, 0.08),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.03)
                  `,
                }}
              />
              {estimatedTime && (
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const minutes = parseInt(estimatedTime, 10);
                    if (isNaN(minutes)) return '';
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    if (hours > 0 && mins > 0) {
                      return `≈ ${hours}h ${mins}min`;
                    } else if (hours > 0) {
                      return `≈ ${hours}h`;
                    } else {
                      return `≈ ${minutes}min`;
                    }
                  })()}
                </p>
              )}
            </div>
          </div>
        );

      case 'tutorial-link':
        const handleTutorialLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setTutorialLink(e.target.value);
        };

        const handleTutorialLinkBlur = () => {
          const trimmed = tutorialLink.trim();
          if (trimmed && !trimmed.match(/^https?:\/\/.+/)) {
            // Se não começar com http:// ou https://, adicionar
            if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
              setTutorialLink(`https://${trimmed}`);
            }
          }
        };

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                value={tutorialLink}
                onChange={handleTutorialLinkChange}
                onBlur={handleTutorialLinkBlur}
                autoFocus
                placeholder="Ex: https://exemplo.com/tutorial"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: `
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                    0 0 0 1px rgba(255, 255, 255, 0.2),
                    0 0 10px rgba(255, 255, 255, 0.08),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.03)
                  `,
                }}
              />
              {tutorialLink && (
                <p className="text-xs text-muted-foreground">
                  <a 
                    href={tutorialLink.startsWith('http') ? tutorialLink : `https://${tutorialLink}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Abrir link
                  </a>
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'name':
        return 'Informações Básicas';
      case 'type':
        return 'Tipo de Tarefa';
      case 'recurring-day':
        return 'Dia do Mês';
      case 'recurring-weekdays':
        return 'Dias da Semana';
      case 'single-date':
        return 'Data da Tarefa';
      case 'time-limit':
        return 'Horário Limite';
      case 'estimated-time':
        return 'Tempo Estimado';
      case 'tutorial-link':
        return 'Link do Tutorial';
      default:
        return 'Criar Nova Tarefa';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'name':
        return 'Comece informando o nome e descrição da tarefa';
      case 'type':
        return 'Escolha se a tarefa será recorrente ou única';
      case 'recurring-day':
        return 'Escolha o dia da primeira execução da tarefa';
      case 'recurring-weekdays':
        return 'Selecione os dias da semana em que a tarefa deve se repetir';
      case 'single-date':
        return '';
      case 'time-limit':
        return 'Defina o horário limite obrigatório para execução da tarefa';
      case 'estimated-time':
        return 'Informe o tempo estimado para execução da tarefa (obrigatório)';
      case 'tutorial-link':
        return '';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {renderStepContent()}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'name' || saving}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="flex gap-2">
              {step === 'tutorial-link' ? (
                <Button
                  onClick={handleSave}
                  disabled={!canProceed() || saving}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Criar Tarefa
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : step === 'type' ? (
                // No passo de tipo, não mostrar botão Próximo (avança automaticamente ao clicar)
                null
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || saving}
                  className="gap-2"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskWizard;
