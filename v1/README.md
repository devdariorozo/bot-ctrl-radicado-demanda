# bot-ctrl-filed-demand

**Autor:** Ramón Dario Rozo Torres
**Versión:** 1.0.0

Bot para **controlar y actualizar el número de radicado** de demandas para el flujo de **Carteras Propias**. Orquesta la lectura de registros pendientes en `tbl_management_ctrl_filed_demand`, automatiza la consulta y validación del radicado en el portal unificado de la Rama Judicial de Colombia ([consultaprocesos.ramajudicial.gov.co](https://consultaprocesos.ramajudicial.gov.co)), procesa correos entrantes vía POP3/IMAP para obtener datos de la demanda, persiste el resultado con trazabilidad completa y opera en horario laboral configurable, excluyendo fines de semana y días festivos o no laborables.

---

## Stack

- **Runtime / Framework:** Node.js 22 LTS · TypeScript 5 · NestJS 10
- **Automatización:** Puppeteer 24 (portal SPA Vuetify — Rama Judicial)
- **Correo:** ImapFlow + MailParser · Poplib (POP3 / IMAP)
- **Persistencia:** MySQL 8 / PostgreSQL (dual) · TypeORM 0.3 (sin `synchronize`)
- **PDF:** pdf-parse
- **API:** REST con prefijo `api/v1` · Swagger en `/docs`
- **Despliegue:** Docker + Docker Compose

---

## Arquitectura

Hexagonal (Ports & Adapters). El dominio depende solo de puertos (interfaces + Symbol tokens); la infraestructura implementa los adaptadores.

```
src/
├── domain/
│   ├── entities/          # Interfaces/tipos del dominio (no clases TypeORM)
│   └── ports/             # Contratos: repositorios, portal, email, bot control
├── application/
│   ├── services/          # Servicios de aplicación (orquestadores y jobs)
│   └── utils/             # Helpers: nameVariants, pagination, response, dateRange
├── infrastructure/
│   ├── logging/           # AppLogger (archivo diario + stdout configurable)
│   └── persistence/
│       ├── entities/      # Entidades TypeORM
│       ├── repositories/  # Implementaciones concretas de cada repositorio
│       ├── migrations/    # Numeradas 177197872900X_ (dual MySQL/PostgreSQL)
│       └── seeds/         # Datos iniciales (run-seeds.ts)
└── interfaces/
    ├── http/
    │   ├── controller/    # Controllers REST
    │   ├── dto/           # DTOs con class-validator
    │   ├── interceptors/  # StandardResponseInterceptor
    │   └── filters/       # JsonParseExceptionFilter
    └── modules/           # Módulos NestJS (uno por entidad de dominio)
```

**Path aliases** (`tsconfig`): `@domain/` · `@application/` · `@infrastructure/` · `@interfaces/`

### Dos bases de datos

| BD | Descripción |
|----|-------------|
| **BD local** (`DB_CONFIG_*`) | Propia del bot: catálogos, horarios, festivos, demandas a gestionar, correos automatizados, control del bot |
| **BDs externas** (MIOS) | Bases MySQL de Carteras Propias. El nombre viene en `management_ctrl_filed_demand.mcfd_name_data_base`. El bot opera sobre ellas con `DataBasesRepository.runQueryOnBase(baseName, sql, params)`. Tablas relevantes: `lawsuits`, `lawsuits_filings`, `clients`, `lawsuit_court_assignments`, `campaigns`, `data_courts` |

---

## Flujo general del sistema

El sistema opera con dos jobs paralelos e independientes:

### 1. Job de sincronización — `CartPropiasDemandsSyncService`

Corre cada `DEMANDS_PRESENTED_SYNC_INTERVAL_MINUTES` (por defecto 30 min). Consulta la BD externa buscando demandas con `lawsuit_status IN ('Presentada', 'Presentada por aplicativo', 'Sin presentar')` cuyo `lawsuits_filings.filing_number` sea nulo o tenga menos de 23 caracteres. Por cada fila encontrada verifica si ya existe un registro activo en `tbl_management_ctrl_filed_demand`; si no existe, lo crea con estado `Abierto`.

### 2. Loop de gestión — `CartPropiasManagementCycleService`

Loop continuo con prioridad de cola (mayor prioridad = más cerca de facturar):

| Prioridad | Estado | Acción |
|---|---|---|
| 0 | `Radicado encontrado` / `Radicado construido` | `runEndCycle` → actualiza BD externa |
| 1 | `Correo Automatizado` / `En proceso` con email | Va al portal (Fase 2 → 1 → 3) |
| 2 | `Novedad portal` (≥ 2 h) | Reintenta fases del portal |
| 3 | `Abierto` | Inicia pipeline completo |
| 4 | `Novedad correo` | Reintenta búsqueda de correo |

Por cada registro, el pipeline ejecuta en orden:

```
Pre-check Fase 2 (datos BD directos, sin correo)
  └─ found       → cierra ciclo
  └─ portal_down → Novedad portal
  └─ not_found   → continúa

Fase correo (EmailInboxAutomationService)
  └─ Correo Automatizado → continúa al portal
  └─ Novedad correo      → fin del turno

Fase 2 rápida con datos del correo (NombreRazonSocial)
  └─ found       → cierra ciclo
  └─ not_found   → ciclo completo de portal

Portal completo: Fase 1 → Fase 2 → Fase 3
  └─ Radicado encontrado / construido → runEndCycle → BD externa actualizada
  └─ Para control manual              → requiere intervención humana
  └─ Novedad portal                   → reintento en próximo ciclo (≥ 2 h)
```

> Para el detalle completo del algoritmo ver [`docs/Entrega_inicial.md`](docs/Entrega_inicial.md).

---

## Estados del registro `mcfd_management_status`

| Estado | Descripción |
|---|---|
| `Abierto` | Registro nuevo, pendiente de iniciar pipeline |
| `En proceso` | Bot tomó el registro (estado transitorio) |
| `Novedad correo` | Sin correo asociado; se reintentará |
| `Correo Automatizado` | Correo vinculado; listo para el portal |
| `Novedad portal` | Portal caído o error técnico; reintento en ≥ 2 h |
| `Radicado encontrado` | Radicado localizado vía portal (Fase 1 o 2) |
| `Radicado construido` | Radicado obtenido vía construcción (Fase 3) |
| `Radicado no visible` | No encontrado en ninguna fase del portal |
| `Para control manual` | Múltiples coincidencias o antigüedad > 3 semanas |

---

## Instalación

### 1. Base de datos

**MySQL:**
```sql
CREATE DATABASE bot_ctrl_filed_demand CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

**PostgreSQL:**
```sql
CREATE DATABASE bot_ctrl_filed_demand;
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores reales. Variables mínimas:

```env
# App
PORT_API=5100
URL_API=http://localhost:5100

# BD local (mysql | postgres)
SCHEMA=mysql
DB_CONFIG_HOST=localhost
DB_CONFIG_PORT=3306
DB_CONFIG_USER=usuario
DB_CONFIG_PASSWORD=password
DB_CONFIG_DATABASE=bot_ctrl_filed_demand

# Correo entrante
MAIL_HOST=mail.dominio.com
MAIL_PROTOCOL=POP3
MAIL_PORT=995
MAIL_USER=usuario@dominio.com
MAIL_PASSWORD=password

# Portal Rama Judicial
PORTAL_QUERIES_URL=https://consultaprocesos.ramajudicial.gov.co
PUPPETEER_SHOW_BROWSER=false

# Carteras propias (formato: campaigns.format:nombre, separados por comas)
COMPANY_NAMES_PORTFOLIO_PROPIAS=1:NOMBRE EMPRESA,2:NOMBRE EMPRESA 2
```

Ver `.env.example` para el listado completo de variables.

### 3. Migraciones y seeds

```bash
npm run migrations   # Crea todas las tablas
npm run seeds        # Carga datos iniciales de catálogos
```

---

## Ejecución

### Modo 1 — Tradicional (sin Docker)

Requiere Node.js 22 LTS y acceso a la BD.

```bash
npm run build        # Compila TypeScript → dist/
npm run dev          # Desarrollo con hot-reload (no requiere build previo)
npm run qa           # Ejecuta build compilado (QA)
npm run pro          # Ejecuta build compilado (Producción)
```

**Logs:** `logs/YYYY-MM-DD-logs-{PROJECT_NAME}.log`

---

### Modo 2 — Docker dev (`docker-compose-dev.yml`)

Servicio `api` con `network_mode: host`. Toda la configuración desde el `.env`.

```bash
# Build de imagen
docker compose -f docker-compose-dev.yml build --no-cache

# Levantar en background
docker compose -f docker-compose-dev.yml up -d

# Rebuild rápido tras cambios
docker compose -f docker-compose-dev.yml up -d --build

# Logs en tiempo real
docker compose -f docker-compose-dev.yml logs -f api

# Entrar al contenedor
docker compose -f docker-compose-dev.yml exec api sh

# Parar / bajar
docker compose -f docker-compose-dev.yml stop
docker compose -f docker-compose-dev.yml down
```

**Logs:** montados en `./logs/` del host.

---

### Modo 3 — Docker producción (`docker-compose.yml`)

Expone `PORT_API`, usa red Docker interna. VPN activa obligatoria si la BD está en servidor remoto.

```bash
docker compose build --no-cache
docker compose up -d
docker compose up -d --build   # Rebuild rápido
docker compose logs -f api
docker compose exec api sh
docker compose stop
docker compose down
```

---

### Resumen comparativo

| Aspecto | Tradicional | Docker dev | Docker pro |
|---------|-------------|------------|------------|
| Archivo compose | — | `docker-compose-dev.yml` | `docker-compose.yml` |
| Red | Host directo | `network_mode: host` | Red Docker interna |
| Logs en host | `./logs/` | `./logs/` + stdout | `./logs/` |
| Hot-reload | Sí (`npm run dev`) | No | No |

---

## Endpoints

Prefijo `api/v1`. Swagger disponible en `{URL_API}/docs`.

| Recurso | Operaciones | Descripción |
|---------|-------------|-------------|
| `health` | GET | Estado del servicio |
| `environmentType` | CRUD | Catálogo de entornos (dev, qa, pro) |
| `stateType` | CRUD | Catálogo de estados (Activo, Inactivo) |
| `portfolioType` | CRUD | Catálogo de tipos de cartera |
| `dataBases` | CRUD | Configuración de BDs externas por cartera/entorno |
| `attentionSchedule` | CRUD | Horarios de atención por cartera |
| `holiday` | CRUD | Festivos y días no laborables |
| `automationEmail` | CRUD | Correos automatizados vinculados a demandas |
| `managementCtrlFiledDemand` | CRUD | Cola principal de demandas a gestionar |
| `botControl` | start / stop / status | Control del loop de automatización |
| `logs` | GET / DELETE | Consulta y purga de logs del sistema |

### Formato estándar de respuesta

**Éxito:**
```json
{
  "status": 200,
  "type": "success",
  "title": "Listar Registros",
  "message": "Operación de consulta ejecutada correctamente.",
  "data": [ ... ]
}
```

**Conflicto (409):**
```json
{
  "status": 409,
  "type": "info",
  "title": "Crear Registro",
  "message": "El registro ya existe",
  "data": null
}
```

---

## Configuración del bot

El bot se controla desde el endpoint `botControl`:

- **`POST /botControl/start`** — inicia el loop de gestión
- **`POST /botControl/stop`** — detiene el loop de gestión
- **`GET /botControl/status`** — estado actual (activo/detenido, cartera seleccionada, hora)

El bot solo opera cuando:
1. Está marcado como activo (`is_running = true`)
2. El horario actual está dentro de `tbl_attention_schedule` para la cartera
3. El día no es festivo no laborable (`tbl_holiday.is_working_day = 0`)

---

## Bugs conocidos

### Conflicto de red Docker ↔ servidor de BD en `172.17.x.x`

Si la BD está en `172.17.x.x` y Docker usa la misma subred, los contenedores no alcanzan la BD.

**Diagnóstico:**
```bash
ip route         # No debe aparecer 172.17.0.0/16 dev br-XXXX
telnet 172.17.8.141 3306
```

**Solución:** cambiar el bridge por defecto de Docker en `/etc/docker/daemon.json`:
```json
{ "bip": "172.30.0.1/16" }
```

Limpiar redes antiguas y reiniciar Docker:
```bash
docker compose down
docker network rm v1_default
sudo service docker restart
```

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [`docs/Entrega_inicial.md`](docs/Entrega_inicial.md) | Algoritmo completo del sistema: flujos, estados, fases del portal, detalles técnicos de Puppeteer y esquema de BD |
| `.env.example` | Referencia de todas las variables de entorno con nombres de ejemplo |

---

## Repositorio

Rama base: `master`. Flujo: `feature/nombre_rama` → PR → merge a `master`.

---

## Licencia

**© 2026 MONTECHELO S.A.S — Todos los derechos reservados**
