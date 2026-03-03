-- Migração de roles: manager -> adm, employee -> backoffice
-- Execute este script no seu banco de dados

-- Atualizar gestores (manager) para administradores (adm)
UPDATE "User" SET role = 'adm' WHERE role = 'manager';

-- Atualizar funcionários (employee) para backoffice (padrão)
UPDATE "User" SET role = 'backoffice' WHERE role = 'employee';
