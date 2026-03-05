import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, User, AlertCircle } from 'lucide-react';
import { Task } from '@/types/task';
import { User as UserType, getRoleLabel } from '@/types/user';

interface TransferTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (taskId: number, newUserId: number) => Promise<void>;
  employees: UserType[];
}

const TransferTaskDialog: React.FC<TransferTaskDialogProps> = ({
  task,
  open,
  onOpenChange,
  onTransfer,
  employees,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar quando o dialog abrir/fechar ou tarefa mudar
  useEffect(() => {
    if (open && task) {
      setSelectedUserId('');
      setError(null);
    }
  }, [open, task]);

  const currentUser = task?.assignedTo
    ? employees.find(e => e.id === task.assignedToId)
    : null;

  // Filtrar usuários disponíveis (excluir o usuário atual)
  const availableUsers = employees.filter(
    emp => emp.id !== task?.assignedToId && emp.active !== false
  );

  const handleTransfer = async () => {
    if (!task || !selectedUserId) {
      setError('Por favor, selecione um usuário para transferir a tarefa');
      return;
    }

    const newUserId = Number(selectedUserId);
    if (newUserId === task.assignedToId) {
      setError('A tarefa já está atribuída a este usuário');
      return;
    }

    try {
      setTransferring(true);
      setError(null);
      await onTransfer(task.id, newUserId);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao transferir tarefa';
      setError(message);
    } finally {
      setTransferring(false);
    }
  };

  if (!task) return null;

  const newUser = selectedUserId
    ? employees.find(e => e.id === Number(selectedUserId))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            Transferir Tarefa
          </DialogTitle>
          <DialogDescription>
            Mova esta tarefa para outro usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Informação da tarefa */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tarefa
              </p>
              <p className="text-sm font-semibold text-foreground">
                {task.name}
              </p>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Fluxo visual: De → Para */}
          <div className="space-y-4">
            {/* De: Usuário Atual */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                De
              </label>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {currentUser?.name || 'Sem atribuição'}
                  </p>
                  {currentUser && (
                    <p className="text-xs text-muted-foreground">
                      {getRoleLabel(currentUser.role)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Seta animada */}
            <div className="flex justify-center -my-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* Para: Novo Usuário */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Para <span className="text-destructive">*</span>
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o novo responsável" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhum usuário disponível
                    </div>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        <div className="flex items-center gap-2">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({getRoleLabel(user.role)})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Preview do novo usuário */}
            {newUser && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-200">
                  <User className="w-5 h-5 text-green-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">
                    {newUser.name}
                  </p>
                  <p className="text-xs text-green-700">
                    {getRoleLabel(newUser.role)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleTransfer}
              className="flex-1"
              disabled={transferring || !selectedUserId || availableUsers.length === 0}
            >
              {transferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Transferir
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={transferring}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferTaskDialog;
