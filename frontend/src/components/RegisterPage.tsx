import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/services/api';

interface RegisterPageProps {
  onBack?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await authApi.register(username, password, name);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar cadastro';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" style={{
        background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.03) 0%, rgba(100, 116, 139, 0.05) 100%)',
      }}>
        <div className="w-full max-w-md">
          <Card
            className="border-0 shadow-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: `
                inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.15),
                0 0 20px rgba(255, 255, 255, 0.1),
                0 4px 16px 0 rgba(0, 0, 0, 0.08),
                0 1px 4px 0 rgba(0, 0, 0, 0.04),
                inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
              `,
            }}
          >
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(34, 197, 94, 0.15) 100%)',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                  }}>
                    <CheckCircle2 className="w-8 h-8" style={{ color: 'rgba(22, 101, 52, 0.9)' }} />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'rgba(15, 23, 42, 0.9)' }}>
                    Cadastro realizado!
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: 'rgba(71, 85, 105, 0.7)' }}>
                    Sua solicitação foi enviada. Aguarde a aprovação do gestor para acessar o sistema.
                  </p>
                </div>
                {onBack && (
                  <Button
                    onClick={onBack}
                    variant="outline"
                    className="w-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para login
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" style={{
      background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.03) 0%, rgba(100, 116, 139, 0.05) 100%)',
    }}>
      <div className="w-full max-w-md">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'rgba(15, 23, 42, 0.9)' }}>Gestor de Tarefas</h1>
          <p className="mt-2" style={{ color: 'rgba(71, 85, 105, 0.7)' }}>Crie sua conta</p>
        </div>

        <Card
          className="border-0 shadow-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: `
              inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
              0 0 0 1px rgba(255, 255, 255, 0.15),
              0 0 20px rgba(255, 255, 255, 0.1),
              0 4px 16px 0 rgba(0, 0, 0, 0.08),
              0 1px 4px 0 rgba(0, 0, 0, 0.04),
              inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
            `,
          }}
        >
          <CardHeader>
            <CardTitle className="text-xl text-center" style={{ color: 'rgba(15, 23, 42, 0.9)' }}>Cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div 
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: 'rgba(239, 68, 68, 0.85)',
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'rgba(239, 68, 68, 0.7)' }} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'rgba(15, 23, 42, 0.8)' }}>Nome completo</label>
                <Input
                  placeholder="Digite seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="border-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: 'rgba(15, 23, 42, 0.9)',
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'rgba(15, 23, 42, 0.8)' }}>Usuário</label>
                <Input
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                  className="border-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: 'rgba(15, 23, 42, 0.9)',
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'rgba(15, 23, 42, 0.8)' }}>Senha</label>
                <Input
                  type="password"
                  placeholder="Digite sua senha (mínimo 4 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  className="border-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: 'rgba(15, 23, 42, 0.9)',
                  }}
                />
              </div>

              <Button
                type="submit"
                className="w-full border-0"
                disabled={loading || !username.trim() || !password.trim() || !name.trim()}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: 'rgba(15, 23, 42, 0.9)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar'
                )}
              </Button>

              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  className="w-full"
                  style={{ color: 'rgba(71, 85, 105, 0.7)' }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para login
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
