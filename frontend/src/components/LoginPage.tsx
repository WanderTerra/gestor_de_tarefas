import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginPageProps {
  onRegister?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onRegister }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await login(username, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" style={{
      background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.03) 0%, rgba(100, 116, 139, 0.05) 100%)',
    }}>
      <div className="w-full max-w-md">
        {/* Logo e título */}
        <div className="text-center mb-8">
          <img
            src="/logosemfundo.png"
            alt="Logo Gestor de Tarefas"
            className="mx-auto mb-4 h-16 w-auto object-contain"
          />
          <h1 className="text-3xl font-bold" style={{ color: 'rgba(15, 23, 42, 0.9)' }}>Gestor de Tarefas</h1>
          <p className="mt-2" style={{ color: 'rgba(71, 85, 105, 0.7)' }}>Faça login para continuar</p>
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
            <CardTitle className="text-xl text-center" style={{ color: 'rgba(15, 23, 42, 0.9)' }}>Login</CardTitle>
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
                    boxShadow: `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                      0 0 0 1px rgba(255, 255, 255, 0.15),
                      0 0 20px rgba(255, 255, 255, 0.1),
                      0 4px 16px 0 rgba(0, 0, 0, 0.08),
                      0 1px 4px 0 rgba(0, 0, 0, 0.04),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                    `,
                    color: 'rgba(239, 68, 68, 0.85)',
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'rgba(239, 68, 68, 0.7)' }} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

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
                    boxShadow: `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                      0 0 0 1px rgba(255, 255, 255, 0.15),
                      0 0 20px rgba(255, 255, 255, 0.1),
                      0 4px 16px 0 rgba(0, 0, 0, 0.08),
                      0 1px 4px 0 rgba(0, 0, 0, 0.04),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                    `,
                    color: 'rgba(15, 23, 42, 0.9)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                      0 0 0 1px rgba(255, 255, 255, 0.3),
                      0 0 30px rgba(255, 255, 255, 0.15),
                      0 4px 16px 0 rgba(0, 0, 0, 0.08),
                      0 1px 4px 0 rgba(0, 0, 0, 0.04),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                    `;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                      0 0 0 1px rgba(255, 255, 255, 0.15),
                      0 0 20px rgba(255, 255, 255, 0.1),
                      0 4px 16px 0 rgba(0, 0, 0, 0.08),
                      0 1px 4px 0 rgba(0, 0, 0, 0.04),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                    `;
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'rgba(15, 23, 42, 0.8)' }}>Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    className="border-0 pr-10"
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
                      color: 'rgba(15, 23, 42, 0.9)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = `
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                        0 0 0 1px rgba(255, 255, 255, 0.3),
                        0 0 30px rgba(255, 255, 255, 0.15),
                        0 4px 16px 0 rgba(0, 0, 0, 0.08),
                        0 1px 4px 0 rgba(0, 0, 0, 0.04),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                      `;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = `
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                        0 0 0 1px rgba(255, 255, 255, 0.15),
                        0 0 20px rgba(255, 255, 255, 0.1),
                        0 4px 16px 0 rgba(0, 0, 0, 0.08),
                        0 1px 4px 0 rgba(0, 0, 0, 0.04),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                      `;
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-700 focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full border-0"
                disabled={loading || !username.trim() || !password.trim()}
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
                  color: 'rgba(15, 23, 42, 0.9)',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.boxShadow = `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                      0 0 0 1px rgba(255, 255, 255, 0.3),
                      0 0 30px rgba(255, 255, 255, 0.15),
                      0 6px 20px 0 rgba(0, 0, 0, 0.12),
                      0 2px 6px 0 rgba(0, 0, 0, 0.06),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                    `;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.15),
                    0 0 20px rgba(255, 255, 255, 0.1),
                    0 4px 16px 0 rgba(0, 0, 0, 0.08),
                    0 1px 4px 0 rgba(0, 0, 0, 0.04),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                  `;
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              {onRegister && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onRegister}
                    className="text-sm underline"
                    style={{ color: 'rgba(37, 99, 235, 0.8)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(37, 99, 235, 1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(37, 99, 235, 0.8)';
                    }}
                  >
                    Não tem conta? Cadastre-se
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
