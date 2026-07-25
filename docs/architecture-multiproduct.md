# Arquitectura Multiproducto (Base)

## Principio clave
- El core es la fuente de verdad para identidad, tenants, roles y suscripciones.
- No se modifica la estructura interna del core.

## Tecnologias por defecto
- Apps de gestion y producto: Java + Spring Boot.
- Python se reserva para implementaciones de IA o necesidades muy especificas.

## Integracion con el core (alto nivel)
- Las apps consumen el core via contratos en `contracts/`.
- El contexto de tenant se inyecta desde gateway o core.

## Convenciones
- Cada app vive en `apps/<nombre-app>/`.
- No se duplica logica de autenticacion ni permisos.