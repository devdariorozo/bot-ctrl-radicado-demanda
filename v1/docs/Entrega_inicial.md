# Entrega Inicial — Bot Control Radicado Demanda

## Descripción general

Sistema automatizado desarrollado en **NestJS + TypeORM** que controla y actualiza el número de radicado de demandas para el flujo de **Carteras Propias**. Opera en horario laboral configurable, excluyendo fines de semana y días festivos o no laborables. Se conecta a bases de datos externas del sistema MIOS, automatiza la consulta en el portal unificado de la Rama Judicial de Colombia ([consultaprocesos.ramajudicial.gov.co](https://consultaprocesos.ramajudicial.gov.co)) mediante Puppeteer, procesa correos entrantes vía POP3/IMAP y persiste resultados con trazabilidad completa.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│                          NestJS App                             │
│                                                                 │
│  ┌──────────────────────┐   ┌──────────────────────────────┐   │
│  │  CartPropias         │   │  CartPropias                 │   │
│  │  DemandsSyncService  │   │  ManagementCycleService      │   │
│  │  (Job periódico)     │   │  (Loop continuo)             │   │
│  └──────────┬───────────┘   └──────────────┬───────────────┘   │
│             │                              │                    │
│             ▼                              ▼                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │       tbl_management_ctrl_filed_demand (BD local)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│             │                              │                    │
│             ▼                              ▼                    │
│  ┌─────────────────┐     ┌─────────────────────────────────┐   │
│  │  BD Externa     │     │  PortalQueriesAutomationService  │   │
│  │  (MIOS / MySQL) │     │  (Puppeteer — Rama Judicial)     │   │
│  └─────────────────┘     └─────────────────────────────────┘   │
│                                      │                          │
│                           ┌──────────┴───────────┐             │
│                           │  EmailInbox           │             │
│                           │  AutomationService    │             │
│                           │  (POP3 / IMAP)        │             │
│                           └───────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Módulos principales

| Módulo / Servicio | Responsabilidad |
|---|---|
| `CartPropiasDemandsSyncService` | Job periódico que sincroniza demandas desde BD externa hacia `tbl_management_ctrl_filed_demand` |
| `CartPropiasManagementCycleService` | Loop continuo que gestiona cada registro: correo → portal fases 1/2/3 |
| `PortalQueriesAutomationService` | Automatización Puppeteer del portal de la Rama Judicial (3 fases) |
| `EmailInboxAutomationService` | Lectura y parseo de correos POP3/IMAP para extraer datos de la demanda |
| `BotControlService` | Control de arranque/parada del bot y validación de horario laboral/festivos |
| `CartPropiasEmailAutomationService` | Job periódico de sincronización de correos entrantes |

---

## 1. Job de sincronización inicial — `CartPropiasDemandsSyncService`

**Frecuencia:** configurable vía `DEMANDS_PRESENTED_SYNC_INTERVAL_MINUTES` (por defecto 30 minutos).

**Objetivo:** detectar demandas en la BD externa que aún no tienen número de radicado y crear el registro de control en `tbl_management_ctrl_filed_demand`.

### Flujo

```
tick()
  └─ ¿Bot activo y en horario? ──No──► omitir ciclo
       │
       ▼
  runSync()
    ├─ Obtener data_bases activa del BotControl
    ├─ Validar que la cartera esté en estado "active"
    └─ Para cada base configurada en db_bases:
         │
         ▼
       fetchPresentedLawsuits(baseName)
         └─ SQL: lawsuits (status IN 'Presentada','Presentada por aplicativo','Sin presentar')
                 INNER JOIN lawsuits_filings (filing_number IS NULL o < 23 chars)
                 LEFT JOIN  lawsuit_court_assignments
                 GROUP BY   lawsuit_id, client_id, lawsuits_filings_id
                 MAX(court_id)   ← garantiza una sola fila por demanda/radicación
         │
         ▼
       Para cada fila encontrada:
         ├─ findActiveForDemand(portfolio_type_id, name_data_base, lawsuit_id, lawsuits_filings_id, state_type_id=1)
         │     ¿Existe registro activo? ──Sí──► skipped++ → continuar
         │
         └─ Crear registro en tbl_management_ctrl_filed_demand
              Estado inicial: "Abierto"
              Detail:         "Demanda abierta para procesar numero de radicado"
```

**Modo manual** (`DEMANDS_PRESENTED_SYNC_MANUAL=true`): restringe la consulta SQL a `CLIENT_ID` y `LAWSUIT_ID` del `.env`, útil para pruebas puntuales.

### Deduplicación

Un registro se considera existente cuando coinciden **todos** estos campos con `mcfd_state_type_id = 1`:

- `mcfd_portfolio_type_id`
- `mcfd_name_data_base`
- `mcfd_lawsuit_id`
- `mcfd_lawsuits_filings_id`

Los campos `mcfd_client_id`, `mcfd_data_courts` y `mcfd_number_filed` son **atributos**, no claves de negocio, y pueden variar entre ejecuciones del sync sin que eso implique un registro nuevo.

---

## 2. Ciclo de gestión — `CartPropiasManagementCycleService`

### Prioridad de cola (orden económico: más cerca de facturar = mayor prioridad)

| Prioridad | Estado | Condición |
|---|---|---|
| 0 | `Radicado encontrado` / `Radicado construido` | Solo ejecuta `runEndCycle` → escribe en BD externa |
| 1 | `Correo Automatizado` / `En proceso` con email | Tiene correo, va al portal |
| 2 | `Novedad portal` | ≥ 2 horas desde última ejecución |
| 3 | `Abierto` | Registro nuevo, inicia pipeline completo |
| 4 | `Novedad correo` | Round-robin por `last_execution` (sin correo aún) |

Dentro de cada prioridad: **más antiguo por `last_execution` primero**.

### Loop principal

```
runLoop()
  ┌──────────────────────────────────────────┐
  │  while (bot activo y no detenido)        │
  │    ├─ checkRuntimeConditions()           │
  │    │     ¿Horario laboral y no festivo?  │
  │    │     ──No──► sleep(STANDBY) → retry  │
  │    │                                     │
  │    ├─ ¿data_bases seleccionada?          │
  │    │     ──No──► sleep(IDLE) → retry     │
  │    │                                     │
  │    ├─ ¿Cartera activa?                   │
  │    │     ──No──► sleep(IDLE) → retry     │
  │    │                                     │
  │    ├─ processNext(portfolioTypeId)        │
  │    │     ──Sin registros──► sleep(IDLE)  │
  │    │     ──Procesó uno──► sleep(BETWEEN) │
  │    └──────────────────────────────────────┘
```

### `processNext` — flujo completo

```
processNext(portfolioTypeId)
  │
  ├─ findNextForManagement()   ← registro según prioridad de cola
  │     ──null──► return false (sin trabajo)
  │
  ├─ Enriquecer registro con datos del juzgado (data_courts → department/city/name)
  │
  ├─ Marcar estado "En proceso" en BD (solo BD, no la variable local)
  │
  ├─ ¿Antigüedad > 3 semanas?
  │     ──Sí──► "Para control manual" → return true
  │
  ├─ runPhase2PreCheck()   ← Fase 2 con datos directos de BD (sin correo)
  │     ┌─ found       → cierra ciclo con runEndCycle() → return true
  │     ├─ portal_down → "Novedad portal" ya guardado   → return true
  │     └─ not_found   → continúa al flujo normal
  │
  ├─ ¿Necesita fase de correo?
  │     (Abierto) O (Novedad correo / En proceso SIN email_id)
  │     ──Sí──► runEmailPhase()
  │               ──No quedó "Correo Automatizado"──► return true
  │
  └─ ¿Listo para portal?
        (Correo Automatizado) O (Novedad portal) O (En proceso CON email_id)
        ──Sí──► runPhase2WithEmailData()
                  ┌─ found / portal_down → return true
                  └─ not_found ──► runPortalPhases() → return true
        ──No──► Red de seguridad: corregir estado inconsistente
```

---

## 3. Fase de correo — `runEmailPhase`

```
runEmailPhase(record)
  │
  ├─ Obtener identification del cliente desde BD externa (clients.identification)
  │     ──Sin identification──► "Novedad correo": "No se encontró identificación del cliente"
  │
  └─ EmailInboxAutomationService.processEmailForRecord(record, identification)
        ├─ Encontrado  → "Correo Automatizado" + autm_id vinculado
        └─ No encontrado → "Novedad correo": "Correo no encontrado en base; se debe reintentar"
```

---

## 4. Fases del portal — `runPortalPhases` (Fase 1 → Fase 2 → Fase 3)

### Pre-condiciones

- Debe existir `mcfd_automation_email_id` (correo vinculado).
- Antigüedad del registro ≤ 3 semanas.
- El correo debe existir en `tbl_automation_email`.

### Fase 1 — NumeroRadicacion (`/Procesos/NumeroRadicacion`)

Aplica solo si el correo tiene `autm_number_filed` con valor.

```
Fase 1
  ├─ Buscar en portal por número de radicado exacto
  │     ──Portal caído──► "Novedad portal" → fin
  │
  ├─ ¿Encontrado y coincide con autm_number_filed?
  │     ──Sí──► applyFoundResult("Radicado encontrado") → runEndCycle() → fin
  │
  └─ No coincide → registrar en detail → continuar Fase 2
```

### Fase 2 — NombreRazonSocial (`/Procesos/NombreRazonSocial`)

Aplica si el correo tiene `autm_natural_person` con valor.

```
Fase 2
  ├─ Construir parámetros:
  │     naturalPerson: autm_natural_person
  │     departament:   autm_departament ?? court_department
  │     city:          autm_city ?? court_city
  │     companyName:   campaigns.name filtrado por COMPANY_NAMES_PORTFOLIO_PROPIAS
  │
  ├─ Generar variantes del nombre (normalización, inversión apellidos/nombres)
  ├─ Descubrir opciones de ciudad disponibles en el portal (discoverCityOptions)
  │
  └─ Para cada variante de nombre × ciudad:
       ├─ Llenar formulario Vuetify SPA (fillP2Nombre + selects)
       │     Timing: 1.500ms entre cada interacción
       ├─ Scroll al botón Consultar + sleep 1.500ms → clickP2Consultar()
       │
       ├─ waitForPhase2Results():
       │     ├─ "Sin resultados explícitos"     → continuar siguiente variante/ciudad
       │     ├─ count = 1
       │     │     ┌─ matchesDemandante(demandante, companyName)?
       │     │     │     ──No──► continuar siguiente variante/ciudad
       │     │     └─ Sí ──► found → applyFoundResult → runEndCycle → fin
       │     │
       │     └─ count > 1 (múltiples resultados del portal):
       │           ├─ filterRowsByCompanyName(companyName)
       │           │     ├─ filtered.count = 1  → found → applyFoundResult → fin
       │           │     ├─ filtered.count = 0  → continue (ninguno es nuestra empresa)
       │           │     └─ filtered.count > 1  → "Para control manual" → fin
       │           └─ Sin companyName → "Para control manual" → fin
       │
       └─ Todas las variantes/ciudades agotadas sin resultado → continúa a Fase 3
```

**Estados posibles al salir de Fase 2:**

| Resultado | Estado |
|---|---|
| Radicado encontrado (único y coincide empresa) | `Radicado encontrado` → BD externa actualizada |
| Múltiples coincidencias de nuestra empresa | `Para control manual` |
| Portal caído | `Novedad portal` |
| Sin coincidencia en todas las variantes | Continúa a Fase 3 |

### Fase 3 — ConstruirNumeroRadicacion (`/Procesos/ConstruirNumeroRadicacion`)

Requiere que el correo tenga todos los campos: `autm_departament`, `autm_city`, `autm_locality`, `autm_court_name`, `autm_specialty`, `autm_office_name`, `autm_year`, `autm_process_code`, `autm_resource_process`.

```
Fase 3
  ├─ Validar campos requeridos
  │     ──Alguno vacío──► "Novedad portal": "No se puede construir el número..."
  │
  ├─ Seleccionar opciones en cascada del portal (Departamento → Ciudad → Juzgado → ...)
  │
  ├─ ¿Múltiples resultados?
  │     ──Sí──► "Para control manual"
  │
  ├─ ¿Encontrado?
  │     ──Sí──► applyFoundResult("Radicado construido") → runEndCycle() → fin
  │
  └─ Sin resultados → "Radicado no visible"
```

---

## 5. Pre-check Fase 2 — `runPhase2PreCheck`

Se ejecuta **al inicio de cada ciclo**, antes del flujo de correo, usando datos directos de la BD externa (no requiere correo vinculado).

```
runPhase2PreCheck(record)
  │
  ├─ fetchClientLocationData():
  │     ├─ naturalPerson: clients.first_name + second_name? + first_last_name + second_last_name?
  │     └─ departament/city: court_department / court_city del registro (data_courts)
  │
  ├─ ¿Sin naturalPerson?
  │     ──Sí──► return 'not_found' (continúa flujo normal)
  │
  ├─ runPhase2(p2Params)
  │
  ├─ portal caído     → "Novedad portal"      → return 'portal_down'
  ├─ multipleResults  → "Para control manual" → return 'found'
  ├─ found            → applyFoundResult → runEndCycle → return 'found'
  └─ not_found        → return 'not_found' (continúa flujo normal)
```

---

## 6. Fase 2 con datos del correo — `runPhase2WithEmailData`

Se ejecuta **después de obtener el correo** y **antes del ciclo completo** (Fases 1/2/3), como optimización para cerrar el ciclo con un solo paso de portal cuando el correo ya está disponible.

```
runPhase2WithEmailData(record)
  │
  ├─ ¿Tiene mcfd_automation_email_id? ──No──► return 'not_found'
  ├─ ¿autm_natural_person con valor?  ──No──► return 'not_found'
  │
  ├─ runPhase2(p2Params con datos del correo)
  │
  ├─ portal caído → "Novedad portal"    → return 'portal_down'
  ├─ found        → applyFoundResult → runEndCycle → return 'found'
  └─ not_found    → return 'not_found' → processNext llama a runPortalPhases
```

---

## 7. Cierre de ciclo — `runEndCycle`

Cuando se encuentra o construye el radicado, se actualiza la BD externa:

```sql
UPDATE lawsuits_filings
   SET filing_number = ?, filing_date = ?, updater_user = ?, comments = ?
 WHERE id = ?;

UPDATE lawsuits
   SET lawsuit_status = 'Radicada', user_id = 1, user_name = ?
 WHERE id = ?;
```

Si el UPDATE falla, el registro queda en `Correo Automatizado` para reintento en el próximo ciclo.

---

## 8. Estados del registro `mcfd_management_status`

| Estado | Descripción |
|---|---|
| `Abierto` | Registro recién creado por el sync, pendiente de iniciar pipeline |
| `En proceso` | Bot tomó el registro para gestión (estado transitorio) |
| `Novedad correo` | No se encontró correo asociado; se reintentará |
| `Correo Automatizado` | Correo vinculado correctamente; listo para ir al portal |
| `Novedad portal` | Portal caído o con error técnico; se reintentará en ≥ 2 horas |
| `Radicado encontrado` | Radicado localizado vía Fase 1 o Fase 2 del portal |
| `Radicado construido` | Radicado obtenido vía Fase 3 del portal |
| `Radicado no visible` | No se encontró en ninguna fase del portal |
| `Para control manual` | Múltiples coincidencias, ambigüedad o antigüedad > 3 semanas |

---

## 9. Tiempos de espera configurables

| Variable | Descripción | Defecto |
|---|---|---|
| `AUTOMATION_IDLE_SLEEP_SEC` | Espera cuando la cola está vacía | 15 s |
| `AUTOMATION_BETWEEN_DEMANDS_SEC` | Espera entre un registro y el siguiente | 1 s |
| `AUTOMATION_STANDBY_SLEEP_SEC` | Espera fuera de horario / festivo | 60 s |
| `AUTOMATION_BOT_STOPPED_SLEEP_SEC` | Espera cuando el bot está detenido | 5 s |
| `PORTAL_RETRY_INTERVAL_MINUTES` | Tiempo mínimo entre reintentos de "Novedad portal" | 30 min |
| `PORTAL_QUERY_WAIT_TIME` | Segundos de espera antes de reintentar consulta portal | 30 s |
| `DEMANDS_PRESENTED_SYNC_INTERVAL_MINUTES` | Frecuencia del job de sincronización | 30 min |
| `AUTOMATION_EMAIL_SYNC_INTERVAL_MINUTES` | Frecuencia del job de correos | 60 min |

---

## 10. Automatización del portal — detalles técnicos (Puppeteer)

- **SPA Vuetify:** las Fases 1 y 2 usan selectores específicos del DOM de la aplicación Vuetify.
- **Timing estándar entre interacciones:** `WAIT_BETWEEN_SELECTS_MS = 1.500 ms` entre cada `fillP2Nombre`, `vuetifySelectByLabel`, y antes del click al botón Consultar.
- **Scroll antes de Consultar:** scroll al botón Consultar + 1.500 ms de espera antes del click para garantizar visibilidad.
- **Variantes de nombre:** el servicio genera variantes normalizadas (sin tildes, inversión apellidos/nombres) para maximizar la coincidencia en el portal.
- **Descubrimiento de ciudades:** `discoverCityOptions` navega al formulario, selecciona el departamento y lee las opciones disponibles del dropdown de Ciudad antes de armar la lista de combinaciones a probar.
- **Filtro por empresa:** `filterRowsByCompanyName` recorre los resultados de la tabla del portal y filtra filas cuyo campo `Demandante` coincida con el valor de `COMPANY_NAMES_PORTFOLIO_PROPIAS` para el formato de cartera correspondiente.
- **Fase 3 (legacy SPA):** usa selectores `select` estándar en cascada (no Vuetify).

---

## 11. Esquema de base de datos local (tabla principal)

**`tbl_management_ctrl_filed_demand`**

| Campo | Tipo | Descripción |
|---|---|---|
| `mcfd_id` | PK | Identificador interno |
| `mcfd_portfolio_type_id` | FK | Tipo de cartera |
| `mcfd_name_data_base` | varchar | Nombre de la BD externa MIOS |
| `mcfd_lawsuit_id` | int | ID de la demanda en BD externa |
| `mcfd_lawsuits_filings_id` | int | ID del registro de radicación en BD externa |
| `mcfd_client_id` | int | ID del cliente en BD externa |
| `mcfd_data_courts` | int (null) | ID del juzgado en BD externa |
| `mcfd_automation_email_id` | FK (null) | Correo automatizado vinculado |
| `mcfd_last_execution` | datetime | Fecha/hora de última gestión |
| `mcfd_retries` | int | Número de intentos realizados |
| `mcfd_filing_date` | date (null) | Fecha de radicación del correo |
| `mcfd_filing_date_action` | date (null) | Fecha de acción de radicación del portal |
| `mcfd_number_filed` | varchar (null) | Número de radicado (23 dígitos) |
| `mcfd_management_status` | varchar | Estado actual del ciclo de gestión |
| `mcfd_detail` | text (null) | Detalle del último resultado |
| `mcfd_state_type_id` | FK | Estado del registro (1 = Activo) |
| `mcfd_responsible` | varchar | Responsable (`BOT ctrl radicado demanda`) |
| `mcfd_created_at` | datetime | Fecha de creación |
| `mcfd_updated_at` | datetime | Fecha de última actualización |

---

## 12. Variables de entorno requeridas

Ver archivo `.env.example` en la raíz del proyecto para la lista completa con los nombres de referencia de cada variable.

---

## 13. Scripts de ejecución

```bash
npm run dev         # Desarrollo con hot-reload
npm run build       # Compilar TypeScript
npm run qa          # Ejecutar distribución compilada (QA)
npm run pro         # Ejecutar distribución compilada (Producción)
npm run migrations  # Ejecutar migraciones de BD
npm run seeds       # Ejecutar seeds iniciales
```
