-- Insert Manager role (can do most things except system/role management)
INSERT INTO roles (name, description, is_system) 
VALUES ('Manager', 'Team manager with broad access to CRM, finance, and trading', true);

-- Insert Agent role (frontline staff: CRM, support, view trades)
INSERT INTO roles (name, description, is_system) 
VALUES ('Agent', 'Sales agent with access to leads, deposits, and support', true);

-- Assign permissions to Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Manager' AND p.key IN (
  'users.manage',
  'deposits.manage',
  'withdrawals.manage',
  'trades.manage',
  'trades.view',
  'staking.manage',
  'content.manage',
  'support.manage',
  'assets.manage'
);

-- Assign permissions to Agent
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Agent' AND p.key IN (
  'users.manage',
  'deposits.manage',
  'trades.view',
  'support.manage'
);