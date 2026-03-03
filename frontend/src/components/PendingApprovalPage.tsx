import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const PendingApprovalPage: React.FC = () => {
  const { logout, user } = useAuth();

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
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.2) 0%, rgba(234, 179, 8, 0.15) 100%)',
                  border: '1px solid rgba(250, 204, 21, 0.3)',
                }}>
                  <Clock className="w-10 h-10" style={{ color: 'rgba(217, 119, 6, 0.9)' }} />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'rgba(15, 23, 42, 0.9)' }}>
                  Aguardando Autorização
                </h2>
                <p className="mt-3 text-sm" style={{ color: 'rgba(71, 85, 105, 0.7)' }}>
                  Olá, <strong>{user?.name}</strong>! Sua solicitação de acesso está aguardando aprovação do gestor.
                </p>
                <p className="mt-2 text-sm" style={{ color: 'rgba(71, 85, 105, 0.6)' }}>
                  Você receberá uma notificação quando sua solicitação for processada.
                </p>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                className="w-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
