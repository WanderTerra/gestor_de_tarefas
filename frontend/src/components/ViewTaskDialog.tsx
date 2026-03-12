import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Pencil } from 'lucide-react';
import { Task, statusConfig, getStatusColorRGB } from '@/types/task';
import { UpdateTaskPayload } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { UserIcon, Clock, Calendar, Repeat, Link as LinkIcon } from 'lucide-react';

interface ViewTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTutorialLink?: (id: number, data: UpdateTaskPayload) => Promise<void>;
  canEditTutorialLink?: boolean;
}

const ViewTaskDialog: React.FC<ViewTaskDialogProps> = ({ 
  task, 
  open, 
  onOpenChange, 
  onUpdateTutorialLink,
  canEditTutorialLink = true 
}) => {
  const [tutorialLink, setTutorialLink] = useState<string>('');
  const [isEditingTutorialLink, setIsEditingTutorialLink] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTutorialLink(task.tutorialLink || '');
      setIsEditingTutorialLink(false);
    }
  }, [task]);

  const handleSaveTutorialLink = async () => {
    if (!task || !onUpdateTutorialLink) return;

    setSaving(true);
    const newLink = tutorialLink.trim() || null;
    const data: UpdateTaskPayload = {
      tutorialLink: newLink,
    };

    // Deslocar operação assíncrona para não bloquear o clique
    setTimeout(async () => {
      try {
        await onUpdateTutorialLink(task.id, data);
        // Atualizar o estado local com o valor salvo usando requestAnimationFrame
        requestAnimationFrame(() => {
          setTutorialLink(newLink || '');
          setIsEditingTutorialLink(false);
        });
      } catch {
        // erro tratado pelo hook
      } finally {
        setSaving(false);
      }
    }, 0);
  };

  if (!task) return null;

  const config = statusConfig[task.status];
  const statusColorRGB = getStatusColorRGB(task.status);

  // Formatar data
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Não definida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formatar tempo estimado
  const formatEstimatedTime = (minutes: number | null | undefined) => {
    if (!minutes) return 'Não definido';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}min`;
    }
  };

  // Formatar dias da semana
  const formatRecurringDays = (days: string | null | undefined) => {
    if (!days) return [];
    const dayMap: Record<string, string> = {
      dom: 'Domingo',
      seg: 'Segunda',
      ter: 'Terça',
      qua: 'Quarta',
      qui: 'Quinta',
      sex: 'Sexta',
      sab: 'Sábado',
    };
    return days.split(',').map(d => dayMap[d.trim()] || d.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Tarefa</DialogTitle>
          <DialogDescription>
            Visualize todas as informações da tarefa
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">Status</label>
            <Badge
              variant="outline"
              className="text-sm font-bold mt-1 ml-2"
              style={{
                background: `rgba(${statusColorRGB}, 0.15)`,
                border: `2px solid rgb(${statusColorRGB})`,
                color: `rgb(${statusColorRGB})`,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              {config.label}
            </Badge>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Tarefa</label>
            <div 
              className="px-3 py-2 rounded-md border text-base"
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
            >
              {task.name}
            </div>
          </div>

          {/* Descrição */}
          {task.description && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <div 
                className="px-3 py-2 rounded-md border text-sm text-muted-foreground"
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
              >
                {task.description}
              </div>
            </div>
          )}

          {/* Motivo (se existir) */}
          {task.reason && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo</label>
              <div 
                className="px-3 py-2 rounded-md border text-sm text-muted-foreground"
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
              >
                {task.reason}
              </div>
            </div>
          )}

          {/* Atribuição */}
          {task.assignedTo && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Atribuído a</label>
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{task.assignedTo.name}</span>
              </div>
            </div>
          )}

          {/* Tarefa Recorrente */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tarefa Recorrente</label>
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{task.isRecurring ? 'Sim' : 'Não'}</span>
            </div>
          </div>

          {/* Dias da Semana (se recorrente) */}
          {task.isRecurring && task.recurringDays && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Dias da Semana</label>
              <div className="flex flex-wrap gap-2">
                {formatRecurringDays(task.recurringDays).map((day, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dia do Mês (se recorrente mensal) */}
          {task.isRecurring && task.recurringDayOfMonth && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Dia do Mês</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Dia {task.recurringDayOfMonth} de cada mês</span>
              </div>
            </div>
          )}

          {/* Deadline (se não for recorrente) */}
          {!task.isRecurring && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Data da Tarefa</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(task.deadline)}</span>
              </div>
            </div>
          )}

          {/* Horário Limite */}
          {task.timeLimit && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Horário Limite</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono">{task.timeLimit}</span>
              </div>
            </div>
          )}

          {/* Tempo Estimado */}
          {task.estimatedTime && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tempo Estimado</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatEstimatedTime(task.estimatedTime)}</span>
              </div>
            </div>
          )}

          {/* Link do Tutorial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Link do Tutorial
              </label>
              {canEditTutorialLink && onUpdateTutorialLink && !isEditingTutorialLink && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Deslocar atualização de estado
                    requestAnimationFrame(() => {
                      setIsEditingTutorialLink(true);
                    });
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded hover:bg-muted"
                  title="Editar link do tutorial"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Editar</span>
                </button>
              )}
              {canEditTutorialLink && onUpdateTutorialLink && isEditingTutorialLink && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Deslocar atualizações de estado
                    requestAnimationFrame(() => {
                      setIsEditingTutorialLink(false);
                      setTutorialLink(task.tutorialLink || '');
                    });
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded hover:bg-muted"
                  title="Cancelar edição"
                >
                  Cancelar
                </button>
              )}
            </div>
            {isEditingTutorialLink && canEditTutorialLink && onUpdateTutorialLink ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={tutorialLink}
                  onChange={(e) => setTutorialLink(e.target.value)}
                  onBlur={() => {
                    const trimmed = tutorialLink.trim();
                    if (trimmed && !trimmed.match(/^https?:\/\/.+/)) {
                      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
                        setTutorialLink(`https://${trimmed}`);
                      }
                    }
                  }}
                  placeholder="Ex: https://exemplo.com/tutorial"
                  autoFocus
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
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveTutorialLink} 
                    disabled={saving}
                    size="sm"
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Deslocar atualizações de estado
                      requestAnimationFrame(() => {
                        setIsEditingTutorialLink(false);
                        setTutorialLink(task.tutorialLink || '');
                      });
                    }}
                    size="sm"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {tutorialLink ? (
                  <div className="space-y-2">
                    <a 
                      href={tutorialLink.startsWith('http') ? tutorialLink : `https://${tutorialLink}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      {tutorialLink}
                    </a>
                  </div>
                ) : (
                  <div 
                    className="px-3 py-2 rounded-md border text-sm text-muted-foreground"
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
                  >
                    Não definido
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Datas de criação e atualização */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Criado em</label>
              <div className="text-sm">{formatDate(task.createdAt)}</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Atualizado em</label>
              <div className="text-sm">{formatDate(task.updatedAt)}</div>
            </div>
          </div>

          {/* Botão de fechar */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewTaskDialog;
