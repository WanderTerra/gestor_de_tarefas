import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { User, getRoleLabel, isManagerRole } from '@/types/user';
import { userApi, ApiError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';

interface UserManagementProps {
  onBack: () => void;
  onNavigate?: (page: 'tasks' | 'completed' | 'users' | 'audit' | 'authorization-requests') => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack, onNavigate }) => {
  const { isManager } = useAuth();

  const handleNavigate = (navPage: 'tasks' | 'users' | 'audit' | 'completed' | 'authorization-requests') => {
    if (navPage === 'users') {
      // Já estamos na página de usuários
      return;
    }
    if (onNavigate) {
      onNavigate(navPage);
    } else {
      onBack();
    }
  };
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('backoffice');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userApi.getAll();
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setName('');
    setRole('backoffice');
  };

  const handleCreate = async () => {
    if (!username.trim() || !password.trim() || !name.trim()) return;

    try {
      setSaving(true);
      setError(null);
      const newUser = await userApi.create({ username, password, name, role });
      setUsers(prev => [...prev, newUser]);
      resetForm();
      setIsDialogOpen(false);
    } catch (err) {
      setError(err instanceof ApiError
        ? err.details ? err.details.map(d => d.mensagem).join(', ') : err.message
        : 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: User) => {
    try {
      setError(null);
      const updated = await userApi.update(user.id, { active: !user.active });
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar usuário');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentPage="users"
        onNavigate={handleNavigate}
        tasks={[]}
      />

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Título da página */}
          <div className="flex items-center justify-between pt-4 mb-6">
            <div className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-foreground">
                Gerenciar Usuários
              </h2>
              <Badge 
                variant="outline"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'rgba(37, 99, 235, 0.6)',
                  boxShadow: `
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                    inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                    inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                    0 2px 8px 0 rgba(0, 0, 0, 0.1),
                    0 1px 4px 0 rgba(0, 0, 0, 0.06),
                    0 0 8px 0 rgba(37, 99, 235, 0.15)
                  `,
                }}
              >
                {users.length} usuário{users.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button
                  size="default"
                  className="gap-2 transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.2) 100%)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'rgba(15, 23, 42, 0.9)',
                    boxShadow: `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                      inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                      inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                      0 2px 8px 0 rgba(0, 0, 0, 0.1),
                      0 1px 4px 0 rgba(0, 0, 0, 0.06)
                    `,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.3) 100%)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.2) 100%)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo</label>
                    <Input
                      placeholder="Nome do funcionário"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Usuário (login)</label>
                    <Input
                      placeholder="Nome de usuário para login"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Senha</label>
                    <Input
                      type="password"
                      placeholder="Senha do usuário"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Perfil</label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adm">Adm</SelectItem>
                        <SelectItem value="backoffice">Backoffice</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="rh">RH</SelectItem>
                        <SelectItem value="monitor">Monitor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleCreate}
                    className="w-full"
                    disabled={saving || !username.trim() || !password.trim() || !name.trim()}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Usuário
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm flex-1">{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-700">✕</Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
              <p className="text-slate-500">Carregando usuários...</p>
            </div>
          )}

          {/* Lista de usuários */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {users.map((user) => (
                <Card 
                  key={user.id} 
                  className={`h-full flex flex-col transition-all duration-200 ${!user.active ? 'opacity-50' : ''}`}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                      0 0 0 1px rgba(255, 255, 255, 0.2),
                      0 0 15px rgba(255, 255, 255, 0.1),
                      0 4px 16px 0 rgba(0, 0, 0, 0.08),
                      0 1px 4px 0 rgba(0, 0, 0, 0.04),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                    `,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                      0 0 0 1px rgba(255, 255, 255, 0.3),
                      0 0 20px rgba(255, 255, 255, 0.15),
                      0 8px 24px 0 rgba(0, 0, 0, 0.12),
                      0 2px 8px 0 rgba(0, 0, 0, 0.06),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.06)
                    `;
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                      0 0 0 1px rgba(255, 255, 255, 0.2),
                      0 0 15px rgba(255, 255, 255, 0.1),
                      0 4px 16px 0 rgba(0, 0, 0, 0.08),
                      0 1px 4px 0 rgba(0, 0, 0, 0.04),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                    `;
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold line-clamp-2 flex-1">{user.name}</CardTitle>
                      <Badge 
                        variant="outline" 
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: isManagerRole(user.role)
                            ? 'rgba(109, 40, 217, 0.6)' 
                            : 'rgba(37, 99, 235, 0.6)',
                          boxShadow: `
                            inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                            inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                            inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                            inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                            0 2px 8px 0 rgba(0, 0, 0, 0.1),
                            0 1px 4px 0 rgba(0, 0, 0, 0.06),
                            0 0 8px 0 ${isManagerRole(user.role)
                              ? 'rgba(109, 40, 217, 0.15)' 
                              : 'rgba(37, 99, 235, 0.15)'}
                          `,
                        }}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-3">
                    <p className="text-sm text-slate-600">@{user.username}</p>
                    <div className="flex-1" />
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                      <Badge 
                        variant="outline"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: user.active ? 'rgba(22, 101, 52, 0.6)' : 'rgba(71, 85, 105, 0.6)',
                          boxShadow: `
                            inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                            inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                            inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                            inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                            0 2px 8px 0 rgba(0, 0, 0, 0.1),
                            0 1px 4px 0 rgba(0, 0, 0, 0.06),
                            0 0 8px 0 ${user.active 
                              ? 'rgba(22, 101, 52, 0.15)' 
                              : 'rgba(71, 85, 105, 0.15)'}
                          `,
                        }}
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(user)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'rgba(15, 23, 42, 0.8)',
                          boxShadow: `
                            inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                            inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                            inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                            inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                            0 2px 8px 0 rgba(0, 0, 0, 0.1),
                            0 1px 4px 0 rgba(0, 0, 0, 0.06)
                          `,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                        }}
                      >
                        {user.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">
                Nenhum usuário encontrado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
