insert into public.permissions (code, description, scope) values
  ('dashboard.read', 'Visualizar o painel inicial', 'condominium'),
  ('condominium.read', 'Visualizar informações do condomínio', 'condominium'),
  ('condominium.manage', 'Gerenciar configurações do condomínio', 'condominium'),
  ('profile.read_self', 'Visualizar o próprio perfil', 'condominium'),
  ('context.read', 'Acessar o contexto autorizado', 'global'),
  ('administrator.read', 'Visualizar a administradora', 'administrator'),
  ('platform.manage', 'Gerenciar recursos da plataforma', 'platform'),
  ('platform.support', 'Acessar recursos de suporte da plataforma', 'platform')
on conflict (code) do update set description = excluded.description, scope = excluded.scope;

insert into public.roles (code, name, scope) values
  ('condominium.syndic', 'Síndico', 'condominium'),
  ('condominium.manager', 'Gestor do condomínio', 'condominium'),
  ('condominium.doorman', 'Porteiro', 'condominium'),
  ('condominium.resident_owner', 'Proprietário morador', 'condominium'),
  ('condominium.resident_tenant', 'Morador locatário', 'condominium'),
  ('administrator.manager', 'Gestor da administradora', 'administrator'),
  ('platform.admin', 'Administrador da plataforma', 'platform'),
  ('platform.support', 'Suporte da plataforma', 'platform')
on conflict (code) do update set name = excluded.name, scope = excluded.scope;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from (values
  ('condominium.syndic', 'dashboard.read'),
  ('condominium.syndic', 'condominium.read'),
  ('condominium.syndic', 'condominium.manage'),
  ('condominium.syndic', 'context.read'),
  ('condominium.manager', 'dashboard.read'),
  ('condominium.manager', 'condominium.read'),
  ('condominium.manager', 'context.read'),
  ('condominium.doorman', 'profile.read_self'),
  ('condominium.resident_owner', 'profile.read_self'),
  ('condominium.resident_owner', 'context.read'),
  ('condominium.resident_tenant', 'profile.read_self'),
  ('condominium.resident_tenant', 'context.read'),
  ('administrator.manager', 'administrator.read'),
  ('administrator.manager', 'context.read'),
  ('platform.admin', 'platform.manage'),
  ('platform.support', 'platform.support')
) as grants(role_code, permission_code)
join public.roles r on r.code = grants.role_code
join public.permissions p on p.code = grants.permission_code
on conflict do nothing;
