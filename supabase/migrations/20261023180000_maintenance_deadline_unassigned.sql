-- Prazo de OS sem responsável: o aviso diário também vai para síndico e gestor ativos.
-- Sem essa regra, uma OS sem responsável não gera nenhum aviso de prazo.

create or replace function maintenance_private.daily() returns void language plpgsql security definer set search_path='' as $$ begin
 perform maintenance_private.generate_due();
 insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
 select w.condominium_id,w.responsible_user_account_id,'maintenance_deadline_alert','Prazo de manutenção','OS #'||w.work_order_number||' · prazo '||w.due_at,'maintenance_work_order',w.id
 from public.maintenance_work_orders w left join public.maintenance_settings s on s.condominium_id=w.condominium_id where w.status not in ('completed','cancelled') and w.responsible_user_account_id is not null and w.due_at<=maintenance_private.today(w.condominium_id)+coalesce(s.alert_advance_days,7) on conflict do nothing;

 insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
 select w.condominium_id,ra.user_account_id,'maintenance_deadline_alert','Prazo de manutenção sem responsável','OS #'||w.work_order_number||' · prazo '||w.due_at||' · sem responsável definido','maintenance_work_order',w.id
 from public.maintenance_work_orders w
 join public.role_assignments ra on ra.condominium_id=w.condominium_id and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now())
 join public.roles r on r.id=ra.role_id and r.code in ('condominium.syndic','condominium.manager') and r.status='active'
 join public.user_accounts ua on ua.id=ra.user_account_id and ua.status='active'
 left join public.maintenance_settings s on s.condominium_id=w.condominium_id
 where w.status not in ('completed','cancelled') and w.responsible_user_account_id is null and w.due_at<=maintenance_private.today(w.condominium_id)+coalesce(s.alert_advance_days,7) on conflict do nothing;

 insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
 select c.condominium_id,ra.user_account_id,'maintenance_contract_expiry','Contrato próximo do vencimento',c.title||' · término '||c.ends_on,'maintenance_contract',c.id
 from public.maintenance_contracts c join public.role_assignments ra on ra.condominium_id=c.condominium_id and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now()) join public.roles r on r.id=ra.role_id and r.code in ('condominium.syndic','condominium.manager') and r.status='active' join public.user_accounts ua on ua.id=ra.user_account_id and ua.status='active'
 left join public.maintenance_settings s on s.condominium_id=c.condominium_id where c.status='active' and c.ends_on<=maintenance_private.today(c.condominium_id)+coalesce(s.alert_advance_days,7) on conflict do nothing;

 insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
 select e.condominium_id,ra.user_account_id,'maintenance_warranty_expiry','Garantia próxima do vencimento',e.identification||' · garantia até '||e.warranty_until,'maintenance_equipment',e.id
 from public.maintenance_equipment e join public.role_assignments ra on ra.condominium_id=e.condominium_id and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now()) join public.roles r on r.id=ra.role_id and r.code in ('condominium.syndic','condominium.manager') and r.status='active' join public.user_accounts ua on ua.id=ra.user_account_id and ua.status='active'
 left join public.maintenance_settings s on s.condominium_id=e.condominium_id where e.status='active' and e.warranty_until<=maintenance_private.today(e.condominium_id)+coalesce(s.alert_advance_days,7) on conflict do nothing;
end $$;
