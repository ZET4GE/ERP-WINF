insert into public.services (category_id, name, type, base_price, currency, description)
select id, v.name, v.type, v.base_price, 'ARS', v.description
from public.service_categories
cross join (
  values
    ('Equipo Starlink Mini', 'unico', 300000, 'Kit de equipo Starlink Mini financiado al cliente.'),
    ('Instalación de antena', 'unico', 120000, 'Cargo único por instalación y puesta en marcha.'),
    ('Servicio mensual Starlink Residencial Lite', 'recurrente', 45000, 'Plan Starlink Residencial Lite, facturado mensualmente.'),
    ('Soporte técnico y gestión WINF', 'recurrente', 20000, 'Soporte técnico y gestión WINF, facturado mensualmente junto al plan.')
) as v(name, type, base_price, description)
where service_categories.name = 'Starlink';
