import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, AlertCircle, UserPlus, X, Filter, Eye, Pencil, Save } from 'lucide-react';
import { User, UserRole, getRoleLabel, isManagerRole } from '@/types/user';
import { userApi, taskApi, ApiError } from '@/services/api';
import Header from '@/components/Header';

interface UserManagementProps {
  onBack: () => void;
  onNavigate?: (page: 'tasks' | 'general' | 'users' | 'audit' | 'authorization-requests' | 'all-tasks', userId?: number) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack, onNavigate }) => {

  const handleNavigate = (navPage: 'tasks' | 'users' | 'audit' | 'general' | 'authorization-requests' | 'all-tasks', userId?: number) => {
    if (navPage === 'users') {
      // Já estamos na página de usuários
      return;
    }
    if (onNavigate) {
      onNavigate(navPage, userId);
    } else {
      onBack();
    }
  };
  const ROLES: UserRole[] = ['adm', 'backoffice', 'supervisor', 'financeiro', 'rh', 'monitor', 'ti-dev', 'marketing'];

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterName, setFilterName] = useState('');
  const [userTaskCounts, setUserTaskCounts] = useState<Record<number, number>>({});

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('backoffice');
  
  // View/Edit user state
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<string>('backoffice');
  const [editPassword, setEditPassword] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);

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

  // Buscar contagem de tarefas para cada usuário
  useEffect(() => {
    if (users.length === 0) return;
    
    const fetchTaskCounts = async () => {
      try {
        const allTasks = await taskApi.getAll();
        const counts: Record<number, number> = {};
        users.forEach(user => {
          counts[user.id] = allTasks.filter(t => t.assignedToId === user.id).length;
        });
        setUserTaskCounts(counts);
      } catch (err) {
        console.error('Erro ao buscar contagem de tarefas:', err);
      }
    };

    fetchTaskCounts();
  }, [users]);

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
      if (viewUser && viewUser.id === user.id) {
        setViewUser(updated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar usuário');
    }
  };

  const handleViewUser = (user: User) => {
    setViewUser(user);
    setEditUsername(user.username);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPassword('');
    setIsEditingUser(false);
  };

  const handleSaveUser = async () => {
    if (!viewUser) return;
    if (!editUsername.trim() || !editName.trim()) return;

    try {
      setSaving(true);
      setError(null);
      const updateData: any = {
        name: editName.trim(),
        role: editRole,
      };
      
      // Só atualizar senha se foi preenchida
      if (editPassword.trim()) {
        updateData.password = editPassword.trim();
      }

      const updated = await userApi.update(viewUser.id, updateData);
      setUsers(prev => prev.map(u => u.id === viewUser.id ? updated : u));
      setViewUser(updated);
      setIsEditingUser(false);
      setEditPassword('');
    } catch (err) {
      setError(err instanceof ApiError
        ? err.details ? err.details.map(d => d.mensagem).join(', ') : err.message
        : 'Erro ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    const q = filterName.trim().toLowerCase();
    if (q) {
      if (!u.name.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasActiveFilters = filterRole !== 'all' || filterName.trim() !== '';

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
                {filteredUsers.length}{hasActiveFilters ? ` de ${users.length}` : ''} usuário{filteredUsers.length !== 1 ? 's' : ''}
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
                  <DialogDescription>
                    Preencha os campos abaixo para criar um novo usuário
                  </DialogDescription>
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
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-700"><X className="w-4 h-4" /></Button>
            </div>
          )}

          {/* Filtros: setor e nome */}
          {!loading && (
            <Card
              className="mb-6"
              style={{
                background: '#fff',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600 shrink-0">
                    <Filter className="w-4 h-4" />
                    Filtros
                  </div>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger
                      className="w-full sm:w-[200px]"
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        color: '#000',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <SelectValue placeholder="Setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os setores</SelectItem>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {getRoleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Filtrar por nome ou usuário"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="flex-1 min-w-0"
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                    }}
                  />
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterRole('all');
                        setFilterName('');
                      }}
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        color: '#000',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      Limpar filtro
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
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
              {filteredUsers.map((user) => (
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
                          color: userTaskCounts[user.id] === 0 
                            ? 'rgba(71, 85, 105, 0.6)'
                            : isManagerRole(user.role)
                            ? 'rgba(109, 40, 217, 0.6)' 
                            : 'rgba(37, 99, 235, 0.6)',
                          boxShadow: `
                            inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                            inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                            inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                            inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                            0 2px 8px 0 rgba(0, 0, 0, 0.1),
                            0 1px 4px 0 rgba(0, 0, 0, 0.06),
                            0 0 8px 0 ${userTaskCounts[user.id] === 0
                              ? 'rgba(71, 85, 105, 0.15)'
                              : isManagerRole(user.role)
                              ? 'rgba(109, 40, 217, 0.15)' 
                              : 'rgba(37, 99, 235, 0.15)'}
                          `,
                        }}
                      >
                        {userTaskCounts[user.id] === 0 ? 'Sem atribuição' : getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-3">
                    <p className="text-sm text-slate-600">@{user.username}</p>
                    {userTaskCounts[user.id] !== undefined && (
                      <p className="text-sm text-slate-600">
                        {userTaskCounts[user.id]} {userTaskCounts[user.id] === 1 ? 'tarefa' : 'tarefas'}
                      </p>
                    )}
                    <div className="flex-1" />
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleViewUser(user);
                        }}
                        className="w-full"
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
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      <div className="flex items-center justify-between">
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

          {!loading && users.length > 0 && filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">
                Nenhum usuário encontrado com os filtros aplicados.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => { setFilterRole('all'); setFilterName(''); }}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  color: '#000',
                }}
              >
                Limpar filtro
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Visualização/Edição de Usuário */}
      <Dialog open={!!viewUser} onOpenChange={(open) => { if (!open) setViewUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditingUser ? 'Editar Usuário' : 'Detalhes do Usuário'}
            </DialogTitle>
            <DialogDescription>
              {isEditingUser ? 'Edite as informações do usuário' : 'Visualize e gerencie as informações do usuário'}
            </DialogDescription>
          </DialogHeader>
          
          {viewUser && (
            <div className="space-y-4 pt-4">
              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                {isEditingUser ? (
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    disabled
                    className="bg-slate-50"
                  />
                ) : (
                  <div className="px-3 py-2 rounded-md border bg-slate-50 text-sm">
                    {viewUser.username}
                  </div>
                )}
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                {isEditingUser ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nome completo"
                  />
                ) : (
                  <div className="px-3 py-2 rounded-md border bg-slate-50 text-sm">
                    {viewUser.name}
                  </div>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Função</label>
                {isEditingUser ? (
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {getRoleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-3 py-2 rounded-md border bg-slate-50 text-sm">
                    {getRoleLabel(viewUser.role)}
                  </div>
                )}
              </div>

              {/* Senha (só ao editar) */}
              {isEditingUser && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nova Senha (opcional)</label>
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a senha atual"
                  />
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex items-center gap-2">
                  <Badge variant={viewUser.active ? 'default' : 'secondary'}>
                    {viewUser.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {!isEditingUser && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(viewUser)}
                    >
                      {viewUser.active ? 'Desativar' : 'Ativar'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Contagem de tarefas */}
              {userTaskCounts[viewUser.id] !== undefined && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tarefas</label>
                  <div className="px-3 py-2 rounded-md border bg-slate-50 text-sm">
                    {userTaskCounts[viewUser.id]} {userTaskCounts[viewUser.id] === 1 ? 'tarefa' : 'tarefas'}
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex gap-2 pt-4 border-t">
                {isEditingUser ? (
                  <>
                    <Button
                      onClick={handleSaveUser}
                      disabled={saving || !editName.trim() || !editUsername.trim()}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingUser(false);
                        setEditUsername(viewUser.username);
                        setEditName(viewUser.name);
                        setEditRole(viewUser.role);
                        setEditPassword('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setIsEditingUser(true)}
                      className="flex-1"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setViewUser(null)}
                      className="flex-1"
                    >
                      Fechar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
