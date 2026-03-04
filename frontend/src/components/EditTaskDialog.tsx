import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Clock } from 'lucide-react';
import { Task, TaskStatus, statusConfig } from '@/types/task';
import { User } from '@/types/user';
import { UpdateTaskPayload } from '@/services/api';

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
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimit, setTimeLimit] = useState('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setStatus(task.status);
      setReason(task.reason || '');
      setIsRecurring(task.isRecurring);
      setSelectedDays(task.recurringDays ? task.recurringDays.split(',') : []);
      setHasTimeLimit(!!task.timeLimit);
      setTimeLimit(task.timeLimit || '');
      setAssignedToId(task.assignedToId ? String(task.assignedToId) : '');
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
        timeLimit: hasTimeLimit ? timeLimit : null,
        assignedToId: assignedToId ? Number(assignedToId) : null,
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Dias da Semana</label>
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
          )}

          {/* Horário Limite */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Horário Limite</label>
            <Switch checked={hasTimeLimit} onCheckedChange={setHasTimeLimit} />
          </div>

          {hasTimeLimit && (
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                type="time"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="pl-10"
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

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1" disabled={saving || !name.trim()}>
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
