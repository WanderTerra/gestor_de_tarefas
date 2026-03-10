import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { Task, TaskStatus, statusConfig } from '@/types/task';
import { User } from '@/types/user';
import { UpdateTaskPayload } from '@/services/api';
import SimpleCalendar from './SimpleCalendar';

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number, data: UpdateTaskPayload) => Promise<void>;
  employees: User[];
}

const daysOfWeek = [
  { id: 'dom', label: 'Dom' },
  { id: 'seg', label: 'Seg' },
  { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' },
  { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' },
  { id: 'sab', label: 'Sáb' },
];

const EditTaskDialog: React.FC<EditTaskDialogProps> = ({ task, open, onOpenChange, onSave, employees }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [reason, setReason] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [tutorialLink, setTutorialLink] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setStatus(task.status);
      setReason(task.reason || '');
      setIsRecurring(task.isRecurring);
      setSelectedDays(task.recurringDays ? task.recurringDays.split(',') : []);
      setRecurringDayOfMonth(task.recurringDayOfMonth ?? null);
      setTimeLimit(task.timeLimit || '');
      setAssignedToId(task.assignedToId ? String(task.assignedToId) : '');
      setEstimatedTime(task.estimatedTime ? String(task.estimatedTime) : '');
      setTutorialLink(task.tutorialLink || '');
      
      // Converter deadline de string para Date se existir
      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        if (!isNaN(deadlineDate.getTime())) {
          setDeadline(deadlineDate);
        }
      } else {
        setDeadline(null);
      }
    }
  }, [task]);

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSave = async () => {
    if (!task || !name.trim()) return;

    const requiresReason = statusConfig[status].requiresReason;
    if (requiresReason && !reason.trim()) return;

    try {
      setSaving(true);
      const data: UpdateTaskPayload = {
        name,
        description: description || undefined,
        status,
        reason: requiresReason ? reason : null,
        isRecurring,
        recurringDays: isRecurring ? selectedDays : null,
        recurringDayOfMonth: isRecurring ? recurringDayOfMonth : null,
        timeLimit: timeLimit || null,
        deadline: !isRecurring && deadline ? deadline.toISOString() : null,
        assignedToId: assignedToId ? Number(assignedToId) : null,
        estimatedTime: estimatedTime.trim() ? (() => {
          const num = parseInt(estimatedTime.trim(), 10);
          return isNaN(num) || num <= 0 ? null : num;
        })() : null,
        tutorialLink: tutorialLink.trim() || null,
      };

      await onSave(task.id, data);
      onOpenChange(false);
    } catch {
      // erro tratado pelo hook
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
          <DialogDescription>
            Atualize as informações da tarefa conforme necessário
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Tarefa</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
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
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
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
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo (se status exigir) */}
          {statusConfig[status].requiresReason && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (obrigatório)</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Informe o motivo"
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
            </div>
          )}

          {/* Atribuição */}
          {employees.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Atribuído a</label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tarefa Recorrente */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Tarefa Recorrente</label>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {isRecurring && (
            <>
              {/* Dia do Mês (para tarefas mensais) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Dia do Mês (opcional)</label>
                <p className="text-xs text-muted-foreground">
                  Selecione um dia do mês para que a tarefa seja executada apenas uma vez por mês neste dia.
                </p>
                <SimpleCalendar
                  selectedDate={recurringDayOfMonth ? (() => {
                    const now = new Date();
                    return new Date(now.getFullYear(), now.getMonth(), recurringDayOfMonth);
                  })() : null}
                  onDateSelect={(date) => {
                    const dayOfMonth = date.getDate();
                    setRecurringDayOfMonth(dayOfMonth);
                  }}
                  dayOfMonthMode={true}
                />
                {recurringDayOfMonth !== null && (
                  <button
                    type="button"
                    onClick={() => setRecurringDayOfMonth(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Remover dia do mês
                  </button>
                )}
              </div>

              {/* Dias da Semana */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Dias da Semana</label>
                {recurringDayOfMonth !== null && (
                  <p className="text-xs text-orange-600">
                    Nota: Domingos serão automaticamente excluídos para tarefas mensais.
                  </p>
                )}
                <div className="grid grid-cols-7 gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        selectedDays.includes(day.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Deadline (apenas para tarefas únicas) */}
          {!isRecurring && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Data da Tarefa</label>
              <SimpleCalendar
                selectedDate={deadline}
                onDateSelect={setDeadline}
                minDate={new Date()}
              />
            </div>
          )}

          {/* Horário Limite (obrigatório) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Horário Limite *</label>
            <input
              type="text"
              value={timeLimit}
              onChange={(e) => {
                let value = e.target.value;
                value = value.replace(/[^\d:]/g, '');
                if (value.length > 5) {
                  value = value.substring(0, 5);
                }
                if (value.length === 2 && !value.includes(':')) {
                  value = value + ':';
                }
                const isValidFormat = 
                  value === '' ||
                  /^\d{1,2}$/.test(value) ||
                  /^\d{1,2}:$/.test(value) ||
                  /^\d{1,2}:\d{1,2}$/.test(value);
                
                if (isValidFormat) {
                  const parts = value.split(':');
                  if (parts.length === 1 && parts[0]) {
                    const hours = parseInt(parts[0]);
                    if (parts[0].length < 2 || hours <= 23) {
                      setTimeLimit(value);
                    }
                  } else if (parts.length === 2) {
                    const hours = parseInt(parts[0]) || 0;
                    const minutesStr = parts[1] || '';
                    const hoursValid = parts[0].length < 2 || hours <= 23;
                    if (hoursValid) {
                      if (minutesStr.length === 0) {
                        setTimeLimit(value);
                      } else if (minutesStr.length === 1) {
                        const firstDigit = parseInt(minutesStr);
                        if (firstDigit <= 5) {
                          setTimeLimit(value);
                        }
                      } else if (minutesStr.length === 2) {
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
              }}
              onBlur={() => {
                if (timeLimit) {
                  const parts = timeLimit.split(':');
                  if (parts.length === 2) {
                    let hours = parseInt(parts[0]) || 0;
                    let minutes = parseInt(parts[1]) || 0;
                    if (hours > 23) hours = 23;
                    if (minutes > 59) minutes = 59;
                    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    setTimeLimit(formatted);
                  } else if (parts.length === 1 && parts[0]) {
                    let hours = parseInt(parts[0]) || 0;
                    if (hours > 23) hours = 23;
                    setTimeLimit(`${String(hours).padStart(2, '0')}:00`);
                  }
                }
              }}
              placeholder="16:00"
              maxLength={5}
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
          </div>

          {/* Tempo Estimado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tempo Estimado (minutos)</label>
            <input
              type="text"
              value={estimatedTime}
              onChange={(e) => {
                let value = e.target.value;
                // Permitir apenas números
                value = value.replace(/\D/g, '');
                // Limitar a um número razoável (ex: 9999 minutos = ~166 horas)
                if (value && parseInt(value, 10) > 9999) {
                  value = '9999';
                }
                setEstimatedTime(value);
              }}
              onBlur={() => {
                if (estimatedTime.trim()) {
                  const num = parseInt(estimatedTime.trim(), 10);
                  if (isNaN(num) || num <= 0) {
                    setEstimatedTime('');
                  } else {
                    setEstimatedTime(String(num));
                  }
                }
              }}
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

          {/* Link do Tutorial */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link do Tutorial (opcional)</label>
            <input
              type="text"
              value={tutorialLink}
              onChange={(e) => setTutorialLink(e.target.value)}
              onBlur={() => {
                const trimmed = tutorialLink.trim();
                if (trimmed && !trimmed.match(/^https?:\/\/.+/)) {
                  // Se não começar com http:// ou https://, adicionar
                  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
                    setTutorialLink(`https://${trimmed}`);
                  }
                }
              }}
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
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Abrir tutorial →
                </a>
              </p>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1" disabled={saving || !name.trim() || !timeLimit.trim()}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
