# Apps

## Regla tecnologica
- Por defecto: Java + Spring Boot.
- Python solo para IA o cuando se requiera de forma justificada.

## Estructura
Cada producto vive en su propia carpeta:
- `apps/<producto>/`

## Integracion
- Consumir el core via contratos y/o clientes ligeros en `shared/clients/`.
- No duplicar identidad ni autorizacion.