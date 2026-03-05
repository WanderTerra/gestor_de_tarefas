import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { User, getRoleLabel, UserRole } from '@/types/user';
import { userApi, ApiError } from '@/services/api';

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number, data: { name?: string; password?: string; role?: string; active?: boolean }) => Promise<void>;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ user, open, onOpenChange, onSave }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('backoffice');
  const [active, setActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar quando o dialog abrir/fechar ou usuário mudar
  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setPassword('');
      setRole(user.role);
      setActive(user.active !== false);
      setShowPassword(false);
      setError(null);
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!user || !name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    // Validar senha se preenchida
    if (password.trim() && password.length < 4) {
      setError('A senha deve ter no mínimo 4 caracteres');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updateData: { name?: string; password?: string; role?: string; active?: boolean } = {
        name: name.trim(),
        role,
        active,
      };

      // Só incluir senha se foi preenchida
      if (password.trim()) {
        updateData.password = password;
      }

      await onSave(user.id, updateData);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError
        ? err.details
          ? err.details.map(d => d.mensagem).join(', ')
          : err.message
        : 'Erro ao atualizar usuário';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const roles: Array<UserRole> = ['adm', 'backoffice', 'supervisor', 'financeiro', 'rh', 'monitor', 'ti-dev', 'marketing'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações do usuário. Deixe a senha em branco para não alterá-la.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nome Completo <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do funcionário"
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

          {/* Username (somente leitura) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Usuário (login)</label>
            <Input
              value={user.username}
              disabled
              className="bg-muted/50 cursor-not-allowed"
              style={{
                background: 'rgba(0, 0, 0, 0.02)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
              }}
            />
            <p className="text-xs text-muted-foreground">
              O nome de usuário não pode ser alterado por questões de segurança
            </p>
          </div>

          {/* Senha (opcional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nova Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para não alterar"
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo 4 caracteres. Deixe em branco para manter a senha atual.
            </p>
          </div>

          {/* Perfil/Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Perfil</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {getRoleLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Ativo/Inativo */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Status</label>
              <p className="text-xs text-muted-foreground">
                {active ? 'Usuário ativo e pode fazer login' : 'Usuário inativo e não pode fazer login'}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
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
              onClick={handleSave}
              className="flex-1"
              disabled={saving || !name.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
