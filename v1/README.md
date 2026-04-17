# bot-demandas-enlinea

**Autor:** Ramón Dario Rozo Torres
**Versión:** 1.0.0

Bot de radicación automática de demandas en línea ante la Rama Judicial de Colombia ([demandaenlinea](https://procesojudicial.ramajudicial.gov.co/demandaenlinea)). Simula el flujo humano completo: acepta términos, diligencia los 6 bloques del formulario, adjunta el PDF de la demanda, resuelve el reCAPTCHA vía Browserless y envía. Opera exclusivamente en horario laboral configurable, excluyendo fines de semana y festivos de Colombia.

---

## Stack

- **Runtime/Framework:** Node.js 22 LTS · TypeScript 5 · NestJS 10
- **Automatización:** Puppeteer 24 + Browserless (navegador en la nube + resolución de captchas)
- **Persistencia:** MySQL 8 · TypeORM 0.3 (sin `synchronize`)
- **API:** REST con prefijo `api/v1` · Swagger en `/docs`
- **Despliegue:** Docker + Docker Compose (tres servicios: dev / qa / pro)

---

## Arquitectura

Hexagonal (Ports & Adapters). El dominio depende solo de puertos (interfaces + Symbol tokens); la infraestructura implementa los adaptadores.

```
src/
├── domain/
│   ├── entities/        # Interfaces/tipos del dominio (no clases TypeORM)
│   ├── ports/           # Contratos: BrowserAutomationPort, ManagementDemandsOnlineRepository,
│   │                    #   DataBasesRepository, DemandPdfPort, BotControlPort, ...
│   └── value-objects/   # IDs con validación (StateTypeId, etc.)
├── application/
│   └── services/        # DemandsOnlineAutomationService (orquestador principal)
│                        # DemandsPendingSyncService · BotControlService · ...
├── infrastructure/
│   ├── browser/         # BrowserlessPuppeteerAdapter → implementa BrowserAutomationPort
│   └── persistence/
│       ├── entities/    # Entidades TypeORM
│       ├── repositories/# Implementaciones concretas de cada repositorio
│       ├── migrations/  # Numeradas 177197872900X_
│       └── seeds/       # Datos iniciales (run-seeds.ts)
└── interfaces/
    ├── http/            # Controllers · DTOs (class-validator)
    └── modules/         # Módulos NestJS (uno por entidad de dominio)
```

**Path aliases** (`tsconfig`): `@domain/` · `@application/` · `@infrastructure/` · `@interfaces/`

### Dos bases de datos

| BD | Descripción |
|----|-------------|
| **BD configuración** (`DB_CONFIG_*`) | Propia del bot; todas las entidades TypeORM (catálogos, horarios, demandas a gestionar, etc.) |
| **BDs de cartera** (externas, dinámicas) | Bases MySQL de terceros. Los nombres vienen en `data_bases.bases` (JSON object) y en `management_demands_online.name_data_base`. Cada clave del objeto es el nombre de la BD; el valor contiene la configuración de servicios asociados (URL y API key del generador de PDF). El bot opera sobre ellas con `DataBasesRepository.runQueryOnBase(baseName, sql, params)`. Tablas relevantes: `lawsuits`, `clients`, `phones`, `lawsuit_court_assignments`, `campaigns`. |

---

## Lógica de sincronización de demandas pendientes

`DemandsPendingSyncService` corre en intervalo configurable (`DEMANDS_PENDING_SYNC_INTERVAL_MINUTES`, por defecto 30 min) y también al arrancar. Solo opera si el bot está iniciado y dentro de horario laboral.

### Modo de ejecución (`DEMANDS_PENDING_SYNC_MANUAL`)

El servicio soporta dos modos de operación controlados por la variable `DEMANDS_PENDING_SYNC_MANUAL`:

| Valor | Modo | Comportamiento |
|-------|------|----------------|
| `false` | **Automático** | Consulta todas las BDs de cartera activas en el intervalo configurado y registra todas las demandas que cumplan los filtros. Es el modo normal de producción. |
| `true` | **Manual** | Procesa únicamente la demanda indicada por `LAWSUIT_ID` del cliente `CLIENT_ID`. Útil para depuración, pruebas o registrar un caso puntual sin esperar el ciclo completo. |

**Variables del job:**

```env
# Intervalo de consulta automática (minutos)
DEMANDS_PENDING_SYNC_INTERVAL_MINUTES=30

# Monto mínimo de la demanda para ser procesada
DEMANDS_PENDING_SYNC_MINIMUM_AMOUNT=1000000

# Estados de la tabla dues válidos para sincronizar (separados por comas)
DEMANDS_PENDING_SYNC_DUES_STATE=186,195

# Tipo de ejecución: true = manual, false = automático
DEMANDS_PENDING_SYNC_MANUAL=false

# Solo requeridos cuando DEMANDS_PENDING_SYNC_MANUAL=true
CLIENT_ID=53330
LAWSUIT_ID=1601

# Modo de envío en el portal: true (o sin valor) = simulación (clic "No"), false = producción real (clic "Sí" + radicado)
DEMANDS_PENDING_SYNC_SIMULATED_PORTAL=true
```

> **Nota:** `CLIENT_ID` y `LAWSUIT_ID` son ignorados cuando `DEMANDS_PENDING_SYNC_MANUAL=false`.

**Condiciones que debe cumplir una demanda para registrarse en `management_demands_online`:**

1. Existe en `lawsuits` con `lawsuit_status = 'Pendiente'` y `deleted_at IS NULL`.
2. Tiene al menos un registro en `lawsuit_court_assignments` cuyo `city_id` esté configurado en `portfolio_city_config` para la BD de cartera activa.
3. El campo `type_quantity` de `lawsuits` tiene correspondencia en la tabla `amount_type` de la BD de configuración (por campo `duplicate`).
4. No existe ya un registro en `management_demands_online` con el mismo `lawsuit_court_assignments_id` + `name_data_base` (evita duplicados).

**Cruce de tablas (BD de cartera):**

```sql
SELECT DISTINCT
  l.id                          AS lawsuit_id,
  l.client_id                   AS lawsuit_client_id,
  l.path_law_doc,
  l.lawsuit_status,
  l.type_quantity,
  l.campaign_id,
  lca.id                        AS lawsuit_court_assignments_id,
  lca.client_id                 AS assignment_client_id,
  lca.city_id
FROM `{name_data_base}`.lawsuits l
INNER JOIN `{name_data_base}`.lawsuit_court_assignments lca
  ON lca.lawsuit_id = l.id
INNER JOIN `{name_data_base}`.dues d
  ON d.client_id = l.client_id
WHERE l.lawsuit_status = 'Pendiente'
  AND l.deleted_at IS NULL
  AND lca.city_id IN ({ids de ciudades configuradas en portfolio_city_config})
  AND d.current_capital_balance >= {DEMANDS_PENDING_SYNC_MINIMUM_AMOUNT}
  AND d.state IN ({DEMANDS_PENDING_SYNC_DUES_STATE})
  -- Solo cuando DEMANDS_PENDING_SYNC_MANUAL=true:
  AND l.client_id = {CLIENT_ID}
  AND l.id       = {LAWSUIT_ID}
```

> El JOIN con `dues` garantiza que solo se sincronizan demandas cuyo cliente tenga saldo de capital activo (`current_capital_balance`) por encima del mínimo configurado y en uno de los estados de cuota válidos. Los filtros manuales (`l.client_id` / `l.id`) se agregan únicamente cuando `DEMANDS_PENDING_SYNC_MANUAL=true`.

Si todas las condiciones se cumplen, se crea el registro en `management_demands_online` con `management_status = 'Abierta'`.

---

## Gestión de demandas

**Control de disponibilidad y cuota de Browserless (`BrowserlessHealthService`):**

Antes de cada conexión WebSocket, el adaptador ejecuta un health-check HTTP contra el servicio Browserless:

| Verificación | Resultado |
|--------------|-----------|
| Servicio no responde / timeout | Error `SERVICE_DOWN` — el caso queda en `Novedad` |
| Token inválido (`401/403`) | Error `AUTH_ERROR` — revisar `BROWSERLESS_API_TOKEN` |
| Cuota agotada (`402/429`) | Error `QUOTA_EXCEEDED` — revisar saldo en el dashboard |
| Fallo al conectar WebSocket (Puppeteer) | Se clasifica el error (cuota, auth o servicio caído) y se loggea con tipo `BROWSERLESS_HEALTH` |
| Cuota ≥ 75 % | `warn` en logs con tipo `BROWSERLESS_QUOTA` |
| Cuota ≥ 90 % | `warn` crítico: riesgo inminente de quedar sin saldo |

Todos los eventos quedan registrados en el log diario con `type: BROWSERLESS_HEALTH` o `BROWSERLESS_QUOTA`.

`BotControlService` valida en cada ciclo:
- `attention_schedule`: horarios activos por cartera; verifica día de la semana y tramo horario (con receso incluido).
- `holiday`: si hoy es festivo no laborable para Colombia (`is_working_day = 0`), el bot no ejecuta.

### Automatización (flujo general)

`DemandsOnlineAutomationService` es el orquestador central. Se lanzan tantos workers paralelos como indique `BROWSERLESS_CONCURRENT_BROWSERS`. Cada worker ejecuta el siguiente ciclo:

1. **Tomar demanda:** `findNextPending()` + `markInProcess()` — operación atómica con bloqueo pesimista; pasa `management_status` a `'En proceso'`.
2. **Resolver datos** — cruces en la BD de cartera (ver apartado siguiente).
3. **Automatizar portal** — delega a `BrowserlessPuppeteerAdapter.procesarLugarEnvioYEspecialidadYClase()`.

   **Comportamiento del select de Localidad (`#DDlLocalidad`):**
   | Escenario | Resultado |
   |-----------|-----------|
   | El select **no existe** en el portal | La ciudad no requiere localidad — el flujo continúa normalmente |
   | El select **existe** y contiene `"00 - DESCONOCIDA / DUDOSA"` o `"Sin Localidad"` | Se selecciona la opción y el flujo continúa |
   | El select **existe** pero **no contiene ninguna** de las dos opciones requeridas | El caso finaliza con `management_status = 'Novedad'` y el detail indica que el select existe pero no tiene ninguna de las opciones requeridas |
4. **Finalizar:**
   - Éxito (`demandaRegistrada: true`): actualiza `management_demands_online` con `management_status = 'Registrada'` y `lawsuit_status = 'Presentada por aplicativo'`; luego sincroniza la BD de cartera (`UPDATE lawsuits SET path_law_doc, lawsuit_status, user_id, user_name WHERE id = lawsuit_id`).
   - Fallo parcial: `management_status = 'Novedad'` con el detalle del punto de falla.

#### Cruces de datos en la BD de cartera

Durante la gestión, el bot consulta la BD de cartera indicada en `management_demands_online.name_data_base` para obtener:

| Dato | Tablas cruzadas | Campo clave |
|------|-----------------|-------------|
| **Demandado** (nombres, identificación, dirección) | `clients` + `lawsuit_court_assignments` | `client_id`, `lawsuit_court_assignments_id` |
| **Teléfono del demandado** | `phones` | `client_id` (primer registro por `id ASC`) |
| **Demandante** (empresa/NIT) | BD configuración `company_type` + BD cartera `campaigns` | `campaign_id` → `campaigns.format` → `company_type` |
| **Apoderado** | BD configuración `lawyer_data` | `portfolio_type_id` |
| **Cuantía / clase de proceso** | BD configuración `amount_type` | `lawsuits.type_quantity` → `amount_type.duplicate` |
| **Ciudad / departamento** | BD configuración `portfolio_city_config` | `portfolio_city_config_id` del registro |

#### Apartado modales iniciales → Información importante y Aceptar términos y condiciones

Al navegar al portal (`DEMANDA_ENLINEA_URL`) el bot gestiona dos modales antes de continuar:

1. **Modal "Información Importante" (condicional):** el portal puede mostrar un aviso de vacancia judicial u otro aviso informativo. Si aparece, el bot lo detecta buscando el título con la expresión `/informaci[oó]n importante/i` y presiona el botón "Continuar" para cerrarlo, esperando a que desaparezca antes de seguir.

2. **Modal de términos y condiciones:** espera el checkbox `#enableCheckbox`, hace clic para aceptarlo y luego presiona el botón "Continuar" (`.jconfirm-buttons .btn.btn-violet`).

Código: `browserlessPuppeteer.adapter.ts` → `navigateAndAcceptModal()` / `maybeHandleInfoImportantModal()`

#### Apartado Lugar de envío → Departamento y Ciudad

Método: `fillLugarEnvio(page, departamento, ciudad)`.

**Selección de Departamento (`#DdlDepartamento`):** espera a que el select esté poblado con más de 2 opciones. Normaliza tanto el texto del select como el valor recibido (NFD sin acentos, mayúsculas, sin espacios extra) y aplica cuatro estrategias de búsqueda en orden: **match exacto → starts with → ends with → contains**. Si ninguna coincide, lanza error y el caso queda en `Novedad`.

**Selección de Ciudad (`#DDlCiudad`):** tras cambiar el departamento, espera a que el select de ciudad se pueble dinámicamente (descarta opciones vacías, `-1` y `SELECCIONE...`). Aplica las mismas cuatro estrategias de búsqueda normalizadas.

**Restricción de horario del portal:** después de seleccionar la ciudad, el portal puede mostrar un modal `"Restricción de Horario"` indicando que ese despacho no atiende en el horario actual. En ese caso, el bot presiona el botón "SALIR" y lanza la excepción `HORARIO_NO_DISPONIBLE: {descripción}`. El orquestador captura este error, persiste el detalle en `management_demands_online.detail` con el tramo horario extraído y pone el caso en `Novedad`. En ciclos siguientes, ese registro se omite hasta que el horario sea válido.

Código: `browserlessPuppeteer.adapter.ts` → `fillLugarEnvio()`

#### Apartado de Especialidad y Clase de Proceso → Especialidad y Clase de Proceso

Método: `fillEspecialidadYClase(page, especialidades[], clasesProceso[])`.

Los valores vienen del campo `amount_type.class_process` (array JSON de objetos con `specialty` y `class`), resuelto en el orquestador según `lawsuits.type_quantity → amount_type.duplicate`.

**Especialidad (`#DDlEspecialidad`):** se recibe un array ordenado de especialidades. El bot intenta cada una en orden (mismas cuatro estrategias de búsqueda normalizadas) y acepta la primera que tenga éxito. Si todas fallan, lanza error y el caso queda en `Novedad` con indicación de revisar `amountType.specialty_process`.

**Clase de Proceso (`#DDlProceso`):** tras seleccionar la especialidad, espera a que el select de clase se pueble. Luego itera el array de clases con el mismo mecanismo. Si ninguna coincide, lanza error.

Código: `browserlessPuppeteer.adapter.ts` → `fillEspecialidadYClase()`

#### Apartado de Sujetos Procesales

Método: `fillSujetosProcesalesDemandanteJuridico()`. Diligencia tres sujetos en secuencia.

**Fase 1 — Demandante (persona jurídica)**

| Campo | Selector / label | Valor |
|-------|-----------------|-------|
| Tipo de sujeto | `#DDlTipodeSujeto` | `DEMANDANTE` |
| Tipo de persona | `#DDlTipoPersona` | `JURÍDICA` |
| Tipo de documento | `#DDlTipodocumento` | `NIT` |
| Número de documento | label `"Número Documento"` | `demandante.nit` (solo dígitos) |
| Razón Social | label `"Razón Social"` | `demandante.name` |
| Dirección | `#IdDireccion` | `demandante.address` |
| Teléfono | `#IdTelefono` | `demandante.phone` |
| Correo | `#IdEmail` + `#btnValidar` | `demandante.email_notifications` |

El correo requiere un sub-flujo especial (`ejecutarCorreoValidarContinuar`): digita el email, presiona `#btnValidar`, espera el mensaje `"CORREO ELECTRONICO VALIDADO CON ÉXITO"` en el modal jconfirm (timeout 25 s) y luego presiona "CONTINUAR". Finaliza con `#btnAddAccionado` para agregar el sujeto a la grilla.

**Fase 2 — Demandado (persona natural)**

| Campo | Selector | Valor |
|-------|----------|-------|
| Tipo de sujeto | `#DDlTipoSujeto` | `DEMANDADO` |
| Tipo de persona | `#DDlTipoPersona` | `NATURAL` |
| Tipo de documento | `#DDlTipodocumento` | Mapeado desde `document_type_name`: `CIUDADANIA → CEDULA DE CIUDADANIA`, `EXTRANJERIA → CEDULA DE EXTRANJERIA`, `PASAPORTE / PA → PASAPORTE` |
| Número de documento | label `"Número Documento"` | `demandado.identification` |
| Primer / Segundo Nombre | labels correspondientes | Normalizado (sin acentos, mayúsculas) |
| Primer / Segundo Apellido | labels correspondientes | Normalizado |
| Tipo de discapacidad | `#DDlTipodiscapacidad` | `NO APLICA` |
| Localidad | `#DDlLocalidad` (condicional) | `"00 - DESCONOCIDA / DUDOSA"` o `"Sin Localidad"` (ver tabla en sección Automatización) |
| Dirección | `#IdDireccion` | `demandado.address` (mayúsculas) |
| Teléfono | `#IdTelefono` | `demandado.phone` (solo dígitos) |

Tras diligenciar, `#btnAddAccionado` agrega el demandado a la grilla.

**Fase 3 — Apoderado (persona natural)**

| Campo | Selector | Valor |
|-------|----------|-------|
| Tipo de sujeto | `#DDlTipoSujeto` | `APODERADO` |
| Tipo de persona | `#DDlTipoPersona` | `NATURAL` |
| Tipo de documento | `#DDlTipodocumento` | `apoderado.document_name` (normalizado) |
| Número de documento | `#DocumentodeIdendificacion` | `apoderado.document_number` (solo dígitos) |
| Primer / Segundo Nombre | `#PrimerNombre` / `#SegundoNombre` | Desde `lawyer_data` |
| Primer / Segundo Apellido | `#PrimerApellido` / `#SegundoApellido` | Desde `lawyer_data` |
| Tipo de discapacidad | `#DDlTipodiscapacidad` | `NO APLICA` |
| Dirección | `#IdDireccion` | `apoderado.address` (normalizado) |
| Teléfono | `#IdTelefono` | `apoderado.phone` (solo dígitos) |
| Correo | `#IdEmail` + `#btnValidar` | `apoderado.email_notifications` (mismo sub-flujo que demandante) |

Finaliza con `#btnAddAccionado`.

Código: `browserlessPuppeteer.adapter.ts` → `fillSujetosProcesalesDemandanteJuridico()`

#### Apartado de Adjuntos → PDF de la demanda

1. **Seleccionar tipo de archivo:** espera a que `#DDlTipoArchivo` se pueble y selecciona la opción `DEMANDA` (normalizado).

2. **Generar PDF:** `POST {url}/external/lawsuits/generatedemandonlinepdf` con `client_id` + `campaign_id` tomados del registro en gestión. La URL y el API key **no provienen del `.env`**; se resuelven en tiempo de ejecución desde `data_bases.bases[management_demands_online.name_data_base].generate_pdf_demand_service`:
   ```json
   {
     "miosv2_carteras_QA": {
       "generate_pdf_demand_service": {
         "url": "https://qa-cartera.groupcos.com/api/v1",
         "api_key": "sk_..."
       }
     }
   }
   ```
   Si el campo `name_data_base` de la demanda no tiene entrada en `bases`, la demanda pasa a `Novedad` con detalle descriptivo. Respuesta esperada: campo `path_demanda_pdf` (ruta relativa en storage, ej. `cartera_propia_QA/demandas_1/demanda_5106997_abc.pdf`). Se persiste en `management_demands_online.path_law_doc`.

3. **Descargar PDF:** `GET {DOWNLOAD_PDF_DEMAND_SERVICE}/local/download/{encodeURIComponent(path_law_doc)}` con header `X-API-Key: {DOWNLOAD_PDF_DEMAND_SERVICE_API_KEY}`. Se guarda en `tmp/{id}-{portfolio_type_id}-{client_id}/{basename(path_law_doc)}`. Se valida que el archivo exista y tenga tamaño ≥ 64 bytes.

4. **Adjuntar en el portal:** como el browser es remoto (Browserless), no se puede usar `fileInput.uploadFile()` directamente. La solución es: leer el PDF local en base64 → construir un objeto `File` en el DOM del navegador vía `page.evaluate()` → asignar a `input.files` y disparar el evento `change`. Luego se presiona `#btnAddfile` y se espera que aparezca la fila en `#tblFiles` (timeout 25 s). Al finalizar la automatización se borra la carpeta temporal con `fs.rmSync(tmpDir, { recursive: true })`.

Documentación del servicio de descarga: [S3 File Manager API – Swagger](https://s3backaws.mysoul.software/docs).

Código: `src/infrastructure/http/demandPdfHttp.adapter.ts` · `src/domain/ports/demandPdf.ports.ts`

#### Apartado Resolver reCAPTCHA

Método: `solveRecaptcha(page, rowId)`.

La URL de conexión a Browserless incluye `solveCaptchas=true`, activando la resolución automática del reCAPTCHA por parte del servicio.

1. **Preparación:** hace scroll al elemento `.g-recaptcha` y abre una sesión CDP (Chrome DevTools Protocol) sobre la página.

2. **Espera en paralelo (race):** el bot lanza dos promesas simultáneas:
   - `tokenPromise` — espera a que `#g-recaptcha-response` tenga valor (token) en el DOM. Timeout: **14 minutos** (margen respecto al límite de sesión de Browserless de 15 min).
   - `autoSolvedPromise` — escucha el evento CDP `Browserless.captchaAutoSolved` emitido por el servicio. El evento trae `{ token?, found?, solved?, time?, error? }`.

3. **Verificación del resultado:**
   - Si gana `tokenPromise` con éxito → reCAPTCHA resuelto, continúa.
   - Si gana `autoSolvedPromise` con `error` → lanza `BROWSERLESS_SOLVE_CAPTCHA_ERROR`.
   - Si `solved = false` → hace una última comprobación de 15 s sobre `#g-recaptcha-response` antes de fallar.
   - Si el token no está presente tras cualquier resultado → lanza `RECAPTCHA_NO_RESUELTO`.

4. **Fallo:** el caso queda en `Novedad` con el detalle indicando que el PDF ya fue adjuntado exitosamente y que el operador debe resolver el reCAPTCHA y presionar ENVIAR manualmente.

Código: `browserlessPuppeteer.adapter.ts` → `solveRecaptcha()`

#### Apartado Modal confirmación de datos

Método: `waitForJconfirmOpenConfirmarDatosAfterEnviar()`.

Tras resolver el reCAPTCHA, el bot espera un delay configurable (`ENVIAR_AFTER_RECAPTCHA_DELAY_MS`, default 1 000 ms) y presiona el botón `#enviar`. Luego espera otro delay (`CONFIRMAR_DATOS_POST_ENVIAR_DELAY_MS`, default 1 000 ms) y lanza la búsqueda del modal de confirmación.

El portal puede mostrar uno o más modales jconfirm intermedios antes del modal definitivo "Confirmar Datos". El método sigue este proceso:

1. Busca todos los `.jconfirm-open` visibles (descarta los ocultos o con `opacity: 0`), ordenados por `z-index` descendente.
2. Para cada modal encontrado:
   - Si el título contiene `"Confirmar Datos"` y los botones incluyen **Sí / No** → modal encontrado.
   - Si contiene botón "CONTINUAR" pero no "Sí / No":
     - Verifica si es un error de validación del portal (spinner en el título, o texto con patrones como `"adjuntar un documento"`, `"tipo archivo de demanda es obligatorio"`, `"debe seleccionar"`, `"correo no coincide"`, etc.).
     - Si es error de validación → lanza `JCONFIRM_PORTAL_VALIDACION`; el caso queda en `Novedad`.
     - Si no → presiona "CONTINUAR", espera cierre del modal y reintenta. Máximo **8 clicks** para evitar bucles infinitos.
3. Timeout total configurable: `CONFIRMAR_DATOS_MODAL_WAIT_MS` (default 15 000 ms).
4. Si se agota el timeout → `failureStage: 'jconfirm_confirmar_datos_timeout'`; el caso queda en `Novedad`.

Código: `browserlessPuppeteer.adapter.ts` → `waitForJconfirmOpenConfirmarDatosAfterEnviar()`

#### Apartado Ciclo final gestión de la demanda

Una vez abierto el modal "Confirmar Datos" con los botones **Sí / No**, el bot actúa según la variable `DEMANDS_PENDING_SYNC_SIMULATED_PORTAL`:

| Valor | Modo | Comportamiento |
|-------|------|----------------|
| `true` | **Simulación** | Presiona "NO" — el flujo completo se ejecuta pero la demanda **no se registra** en el portal. Útil para verificar que todo funciona antes de ir a producción. |
| `false` | **Producción real** | Presiona "SÍ" → doble confirmación → espera el modal de radicado → extrae el número de radicado → presiona "Finalizar". La demanda queda registrada oficialmente ante la Rama Judicial. |
| *(sin valor / vacío / undefined)* | **Simulación** | Por defecto seguro: si la variable no está definida se comporta igual que `true`. |

> **Regla de seguridad:** el modo producción real **solo se activa con `false` explícito**. Cualquier otro valor (incluyendo ausencia de la variable) mantiene la simulación.

**Resultado exitoso (`demandaRegistrada: true`):**
1. Actualiza `management_demands_online`: `management_status = 'Registrada'`, `lawsuit_status = 'Presentada por aplicativo'`, `detail` con descripción de la acción tomada en el modal.
2. Sincroniza la BD de cartera:
   ```sql
   UPDATE `{name_data_base}`.lawsuits
   SET path_law_doc = ?, lawsuit_status = 'Presentada por aplicativo',
       user_id = ?, user_name = 'BOT demands online'
   WHERE id = ?
   ```
3. Borra la carpeta temporal `tmp/{id}-{portfolio_type_id}-{client_id}/`.

**Resultado con fallo parcial (`demandaRegistrada: false`):** el caso queda en `management_status = 'Novedad'` con un `detail` orientado a operaciones que describe el punto exacto de falla:

| `failureStage` | Descripción en `detail` |
|----------------|------------------------|
| `pdf_generate` | Error al generar el PDF; adjuntar manualmente. |
| `pdf_download` | Error al descargar el PDF; adjuntar manualmente. |
| `portal_adjunto_no_en_grilla` | El portal no registró el PDF en `#tblFiles` tras "Agregar Archivo". |
| `recaptcha` | PDF adjuntado; reCAPTCHA no resuelto. Resolver y enviar manualmente. |
| `portal_enviar_validation_error` | El portal mostró un error de validación tras ENVIAR; revisar adjuntos. |
| `jconfirm_confirmar_datos_timeout` | Modal "Confirmar Datos" no apareció a tiempo; aumentar `CONFIRMAR_DATOS_MODAL_WAIT_MS`. |
| Sin `reachedArchivosAdjuntos` | Falta demandado/apoderado; completar manualmente desde el portal. |

El campo `detail` se trunca a 480 caracteres para ajustarse al límite de la columna en BD.

Código: `browserlessPuppeteer.adapter.ts` · `demandsOnlineAutomation.service.ts`
---

## Instalación

### 1. Base de datos

```sql
CREATE DATABASE bot_ctrl_filed_demand CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

Tablas gestionadas por migraciones: `environment_type`, `state_type`, `portfolio_type`, `data_bases`, `attention_schedule`, `portfolio_city_config`, `amount_type`, `company_type`, `lawyer_data`, `holiday`, `management_demands_online`, `bot_control`.

### 2. Variables de entorno

```bash
cp .env.example .env
```

Variables mínimas:

```env
# App
PORT_API=5006
URL_API=http://localhost:5006

# BD configuración
DB_CONFIG_HOST=localhost
DB_CONFIG_PORT=3306
DB_CONFIG_USER=tu_usuario
DB_CONFIG_PASSWORD=tu_password
DB_CONFIG_DATABASE=bot_ctrl_filed_demand

# Browserless
BROWSERLESS_ENDPOINT=wss://...
BROWSERLESS_API_TOKEN=...
BROWSERLESS_CONCURRENT_BROWSERS=1

# PDF
# La URL y el API key del servicio generador de PDF se administran por base de datos
# en el campo `bases` de la tabla `data_bases` (clave generate_pdf_demand_service).

# Loop del bot (segundos)
AUTOMATION_IDLE_SLEEP_SEC=15
AUTOMATION_BETWEEN_DEMANDS_SEC=2
AUTOMATION_STANDBY_SLEEP_SEC=60

# Job: sincronización de demandas pendientes
DEMANDS_PENDING_SYNC_INTERVAL_MINUTES=30
DEMANDS_PENDING_SYNC_MINIMUM_AMOUNT=1000000
DEMANDS_PENDING_SYNC_DUES_STATE=186,195
DEMANDS_PENDING_SYNC_MANUAL=false
# CLIENT_ID=53330      # Solo si DEMANDS_PENDING_SYNC_MANUAL=true
# LAWSUIT_ID=1601      # Solo si DEMANDS_PENDING_SYNC_MANUAL=true
```

Ver `.env.example` para el listado completo.

### 3. Migraciones y seeds

```bash
npm run migrations   # Crea todas las tablas
npm run seeds        # Carga datos iniciales
```

Para arrancar el sistema ver la sección **Ejecución** a continuación.

---

## Ejecución

El sistema soporta tres modos de arranque. En todos los casos el `.env` debe estar configurado antes de iniciar (ver sección **Instalación**).

---

### Modo 1 — Tradicional (sin Docker)

Requiere Node.js 22 LTS y MySQL accesible desde la máquina local.

```bash
# Compilar TypeScript → dist/  (obligatorio antes de qa y pro)
npm run build

# Arrancar según el ambiente
npm run dev   # Desarrollo con hot-reload (nest start --watch, no requiere build previo)
npm run qa    # Ejecuta el build compilado apuntando a la BD de QA
npm run pro   # Ejecuta el build compilado apuntando a la BD de PRO
```

> `npm run dev` compila en memoria con `nest start --watch`, por lo que **no requiere `npm run build` previo**. Para `qa` y `pro` el build sí es obligatorio, ya que ejecutan `node dist/main`.

**Logs:** `v1/logs/YYYY-MM-DD-logs-{PROJECT_NAME}.log`

---

### Modo 2 — Docker ambiente dev (`docker-compose-dev.yml`)

Un servicio `api` + `redis`, ambos con `network_mode: host` (comparten la red del host directamente). Toda la configuración sale del `.env`.

Todos los comandos desde `v1/`:

```bash
# Build de imagen (--no-cache para rebuild completo)
docker compose -f docker-compose-dev.yml build --no-cache

# Levantar en background
docker compose -f docker-compose-dev.yml up -d

# Rebuild rápido tras cambios de código o dependencias
docker compose -f docker-compose-dev.yml up -d --build

# Ver logs en tiempo real
docker compose -f docker-compose-dev.yml logs -f          # todos los servicios
docker compose -f docker-compose-dev.yml logs -f api      # solo la API

# Entrar al contenedor
docker compose -f docker-compose-dev.yml exec api sh

# Parar (sin eliminar contenedores)
docker compose -f docker-compose-dev.yml stop

# Bajar y eliminar contenedores
docker compose -f docker-compose-dev.yml down
```

**Logs:** montados en `v1/logs/` del host (volumen `./logs:/usr/src/app/logs`). También visibles en tiempo real con `docker compose logs -f` gracias al override `NODE_ENV=development` que habilita la salida a consola.

---

### Modo 3 — Docker ambiente pro (`docker-compose.yml`)

Configurado para producción: expone el puerto `PORT_API`, usa red Docker interna (`bot-demandas-enlinea`) y monta logs en el host.

> **VPN activa obligatoria.** `DB_CONFIG_HOST` debe apuntar al servidor de BD correspondiente.

Todos los comandos desde `v1/`:

```bash
# Build de imagen
docker compose build --no-cache

# Levantar en background
docker compose up -d

# Rebuild rápido
docker compose up -d --build

# Ver logs en tiempo real
docker compose logs -f
docker compose logs -f api

# Entrar al contenedor
docker compose exec api sh

# Parar / bajar
docker compose stop
docker compose down
```

**Logs:** montados en `v1/logs/` del host (volumen `./logs:/usr/src/app/logs`). En modo pro los logs solo van a archivo (stdout suprimido con `NODE_ENV=production`).

---

### Resumen comparativo

| Aspecto | Tradicional | Docker dev | Docker pro |
|---------|-------------|------------|------------|
| Archivo compose | — | `docker-compose-dev.yml` | `docker-compose.yml` |
| Comando arranque | `npm run build` → `npm run dev/qa/pro` | `docker compose -f docker-compose-dev.yml up -d` | `docker compose up -d` |
| Red | Host directo | `network_mode: host` | Red Docker interna |
| Logs en host | `v1/logs/` | `v1/logs/` + stdout (`logs -f`) | `v1/logs/` |
| Hot-reload | Sí (`npm run dev`) | No | No |
| VPN requerida | Solo QA/PRO | Solo QA/PRO | Sí |

---

## Endpoints

Prefijo `api/v1`. Swagger: `{URL_API}/docs` (el valor de `URL_API` del `.env` determina la URL; por defecto `http://localhost:{PORT_API}`)

| Recurso | Operaciones | Notas |
|---------|-------------|-------|
| `health` | GET | Estado del servicio |
| `environmentType` | CRUD | Catálogo: dev, docker, qa, pro |
| `stateType` | CRUD | Catálogo: Active, Inactive |
| `portfolioType` | CRUD | Catálogo: Propias, Sudameris |
| `dataBases` | CRUD + GET /byEnvAndPortf | BD por entorno/cartera; campo `bases` es un JSON object donde cada clave es el nombre de la BD y el valor contiene `generate_pdf_demand_service` (url + api_key) |
| `attentionSchedule` | CRUD + GET /byPortfolio | `days` array JSON en español; UNIQUE por `(portfolio_type_id, start_time, end_time)` |
| `portfolioCityConfig` | CRUD + GET /byDataBasesAndCityViews + GET /vCitiesFetch | `vCitiesFetch` consulta la vista `v_cities` de la primera base del registro |
| `amountType` | CRUD | Cuantías con `class_process` (array JSON de especialidades/clases) |
| `managementDemandsOnline` | CRUD | Cola de demandas; `management_status`: Abierta → En proceso → Registrada / Novedad |
| `botControl` | start / stop / status | Control del loop de automatización |

---

## Bugs / Problemas conocidos

### Conflicto de red Docker ↔ servidor QA (172.17.x.x)

Si el servidor de QA está en `172.17.x.x` y Docker usa la misma subred, los contenedores no alcanzan la BD.

**Diagnóstico:**
```bash
ip route   # No debe aparecer 172.17.0.0/16 dev br-XXXX
telnet 172.17.8.141 3306
```

**Solución:** cambiar el bridge por defecto de Docker en `/etc/docker/daemon.json`:
```json
{ "bip": "172.30.0.1/16" }
```

Luego limpiar redes antiguas y reiniciar Docker:
```bash
docker compose down
docker network rm v1_default   # si aún existe
sudo service docker restart
```

---

## Repositorio

[Azure DevOps – bot-demandas-enlinea](https://dev.azure.com/MontecheloPipelines/SquadMiosV2/_git/bot-demandas-enlinea)

Rama base: `master`. Flujo: `feature/nombre_rama` → PR → merge a `master`.

---

## 📄 Licencia

**© 2026 MONTECHELO S.A.S - Todos los derechos reservados**
