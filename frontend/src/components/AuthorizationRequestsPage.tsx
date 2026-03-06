import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, AlertCircle, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { User } from '@/types/user';
import { authApi } from '@/services/api';
import Header from '@/components/Header';

interface AuthorizationRequestsPageProps {
  onBack: () => void;
  onNavigate?: (page: 'tasks' | 'completed' | 'users' | 'audit' | 'authorization-requests' | 'all-tasks') => void;
}

const AuthorizationRequestsPage: React.FC<AuthorizationRequestsPageProps> = ({ onBack, onNavigate }) => {
  const handleNavigate = (navPage: 'tasks' | 'users' | 'audit' | 'completed' | 'authorization-requests' | 'all-tasks') => {
    if (navPage === 'authorization-requests') {
      // Já estamos na página de solicitações
      return;
    }
    if (onNavigate) {
      onNavigate(navPage);
    } else {
      onBack();
    }
  };
  const [requests, setRequests] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('backoffice');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authApi.getPendingRequests();
      setRequests(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar solicitações';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      setApprovingId(userId);
      setError(null);
      await authApi.approveUser(userId, selectedRole);
      await loadRequests();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao aprovar usuário';
      setError(message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId: number) => {
    try {
      setRejectingId(userId);
      setError(null);
      await authApi.rejectUser(userId, rejectionReason || undefined);
      setRejectionReason('');
      await loadRequests();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao rejeitar usuário';
      setError(message);
    } finally {
      setRejectingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (requestedAt?: string): boolean => {
    if (!requestedAt) return false;
    const requestDate = new Date(requestedAt);
    const now = new Date();
    const diffTime = now.getTime() - requestDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    // Considera atrasado se passou mais de 3 dias
    return diffDays > 3;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentPage="authorization-requests"
        onNavigate={handleNavigate}
        tasks={[]}
      />

      {/* Conteúdo */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div 
            className="mb-6 flex items-center gap-2 p-4 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'rgba(239, 68, 68, 0.85)',
            }}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
            <p className="text-slate-500">Carregando solicitações...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto" />
            <p className="text-slate-500 text-lg">Nenhuma solicitação pendente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request) => (
              <Card
                key={request.id}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold">{request.name}</CardTitle>
                    <div className="flex flex-col gap-1 items-end">
                      {isOverdue(request.requestedAt) ? (
                        <Badge
                          variant="outline"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(12px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'rgba(248, 113, 113, 0.6)',
                            boxShadow: `
                              inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                              inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                              inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                              inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                              0 2px 8px 0 rgba(0, 0, 0, 0.1),
                              0 1px 4px 0 rgba(0, 0, 0, 0.06),
                              0 0 8px 0 rgba(248, 113, 113, 0.15)
                            `,
                          }}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Atrasado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(12px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'rgba(250, 204, 21, 0.6)',
                            boxShadow: `
                              inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                              inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                              inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                              inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                              0 2px 8px 0 rgba(0, 0, 0, 0.1),
                              0 1px 4px 0 rgba(0, 0, 0, 0.06),
                              0 0 8px 0 rgba(250, 204, 21, 0.15)
                            `,
                          }}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs" style={{ color: 'rgba(71, 85, 105, 0.6)' }}>Usuário:</p>
                    <p className="text-sm font-medium" style={{ color: 'rgba(15, 23, 42, 0.8)' }}>
                      @{request.username}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'rgba(71, 85, 105, 0.6)' }}>Solicitado em:</p>
                    <p className="text-sm" style={{ color: 'rgba(15, 23, 42, 0.7)' }}>
                      {formatDate(request.requestedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          style={{
                            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%)',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            color: 'rgba(22, 101, 52, 0.9)',
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprovar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Aprovar Usuário</DialogTitle>
                          <DialogDescription>
                            Selecione o papel do usuário e confirme a aprovação
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <p className="text-sm mb-2">
                              Aprovar <strong>{request.name}</strong> (@{request.username})?
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Perfil</label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="backoffice">Backoffice</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                <SelectItem value="financeiro">Financeiro</SelectItem>
                                <SelectItem value="rh">RH</SelectItem>
                                <SelectItem value="monitor">Monitor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={() => handleApprove(request.id)}
                            disabled={approvingId === request.id}
                            className="w-full"
                            style={{
                              background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(34, 197, 94, 0.15) 100%)',
                              border: '1px solid rgba(74, 222, 128, 0.3)',
                              color: 'rgba(22, 101, 52, 0.9)',
                            }}
                          >
                            {approvingId === request.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Aprovando...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Confirmar Aprovação
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          style={{
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: 'rgba(185, 28, 28, 0.9)',
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rejeitar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rejeitar Usuário</DialogTitle>
                          <DialogDescription>
                            Forneça um motivo para a rejeição (opcional)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <p className="text-sm mb-2">
                              Rejeitar <strong>{request.name}</strong> (@{request.username})?
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Motivo (opcional)</label>
                            <Input
                              placeholder="Digite o motivo da rejeição"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                            />
                          </div>
                          <Button
                            onClick={() => handleReject(request.id)}
                            disabled={rejectingId === request.id}
                            className="w-full"
                            style={{
                              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: 'rgba(185, 28, 28, 0.9)',
                            }}
                          >
                            {rejectingId === request.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Rejeitando...
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Confirmar Rejeição
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorizationRequestsPage;
