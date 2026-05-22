// Responsabilidad: servicio independiente de automatización del portal de consultas de procesos.
// Usa Puppeteer para interactuar con las tres fases del portal (NumeroRadicacion,
// NombreRazonSocial, ConstruirNumeroRadicacion). Reutilizable por cualquier tipo de cartera.

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser, Page } from 'puppeteer';
import type {
  Phase1Params,
  Phase2Params,
  Phase3Params,
  PortalPhaseResult,
} from '@domain/ports/portalQueries.ports';
import { generateNameVariants, normalize } from '@application/utils/nameVariants.utils';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

// ─── Selector constants ────────────────────────────────────────────────────────
const SEL = {
  // Phase 1 — NumeroRadicacion (Vuetify SPA — selectores extraídos del DOM real)
  p1RadioTodos: 'input#input-113',
  p1Input: 'input#input-117, input[placeholder*="dígitos" i], input[maxlength="23"]',
  p1BtnConsultar: 'button[aria-label="Consultar Número de radicación"]',
  p1ResultRows: '.v-data-table__wrapper table tbody tr',

  // Phase 3 — ConstruirNumeroRadicacion (selectores legacy — portal SPA no-Vuetify)
  p3Dept: '#ddlDepartamento, select[id*="Departamento" i]',
  p3Ciudad: '#ddlCiudad, select[id*="Ciudad" i]',
  p3Juzgado: '#ddlJuzgado, select[id*="Juzgado" i]',
  p3Especialidad: '#ddlEspecialidad, select[id*="Especialidad" i]',
  p3Despacho: '#ddlDespacho, select[id*="Despacho" i]',
  p3Anio: '#ddlAnio, select[id*="Anio" i]',
  p3CodProceso: '#ddlCodigoProceso, select[id*="Codigo" i]',
  p3Recurso: '#ddlRecurso, select[id*="Recurso" i]',
  p3BtnBuscar: '#btnConstruir, #btnBuscar, button.btn-primary:not([id*="limpiar" i])',

  // Results legacy (phase 3)
  resultTable: '#divResultado table, .table-procesos, table.table',
  noResults: '.alert-warning, .sin-resultado, .no-encontrado, #divSinResultados',

  // Phase 2 — explicit "no results" alert (Vuetify SPA)
  p2NoResults: '.v-alert[role="alert"] .v-alert__content p',
  // Phase 2 — diálogo "varios registros con el mismo nombre o razón social"
  p2MultipleDialog: 'div[role="dialog"]',
  // Diálogo de error del portal (todas las fases) — ej: "Error: timeout of 50000ms exceeded"
  portalErrorMsg: 'div[role="dialog"][aria-modal="true"] .v-alert__content p',
};

const PAGE_TIMEOUT_MS = 30_000;
const WAIT_LOAD = 'networkidle2' as const;
const WAIT_BETWEEN_SELECTS_MS = 1_500;
const INITIAL_WAIT_MS = 3_000;  // espera mínima tras click para que la SPA lance la petición
const POLL_INTERVAL_MS = 5_000; // intervalo de verificación de resultados

interface ExtractedResult {
  count: number;
  filingNumber: string;
  filingDate: string;
  filingDateAction: string;
  /** Texto del campo Demandante extraído de la columna Sujetos Procesales (primer resultado). */
  demandante: string;
  /** Mensaje de error mostrado por el portal en diálogo (ej: "Error: timeout of 50000ms exceeded"). */
  portalError?: string;
}

interface Phase2ExtractedResult extends ExtractedResult {
  /** true cuando el portal devolvió explícitamente "La consulta no generó resultados" */
  explicitNoResults: boolean;
}

@Injectable()
export class PortalQueriesAutomationService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private readonly baseUrl: string;
  private readonly showBrowser: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {
    this.baseUrl = this.configService
      .get<string>('PORTAL_QUERIES_URL', 'https://consultaprocesos.ramajudicial.gov.co')
      .replace(/\/$/, '');
    this.showBrowser =
      this.configService.get<string>('PUPPETEER_SHOW_BROWSER', 'false').trim().toLowerCase() === 'true';
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  // ─── Phase 1: buscar por número de radicado ────────────────────────────────

  async runPhase1(params: Phase1Params): Promise<PortalPhaseResult> {
    let page: Page;
    try {
      page = await this.openPage();
    } catch (err) {
      this.logWarn('phase1_launch', err);
      await this.closeBrowser();
      return unavailable(errMsg(err));
    }
    try {
      const available = await this.navigateTo(page, '/Procesos/NumeroRadicacion');
      if (!available) return unavailable('Portal no disponible en /NumeroRadicacion');

      await this.selectTodosLosProcesos(page);
      await this.fillPhase1Input(page, params.filingNumber);
      await this.clickPhase1Consultar(page);

      const extracted = await this.waitForPhase1Results(page);

      if (extracted.portalError) {
        return unavailable(extracted.portalError);
      }

      if (extracted.count === 0) {
        return { available: true, found: false, multipleResults: false };
      }
      if (extracted.count > 1) {
        return { available: true, found: false, multipleResults: true };
      }

      // Resultado único: validar que el demandante sea nuestra empresa antes de aceptarlo
      if (params.companyName && params.companyName !== '-' && params.companyName.trim() !== '' && extracted.demandante) {
        if (!this.matchesDemandante(extracted.demandante, params.companyName)) {
          this.appLogger.structured({
            level: 'warn',
            context: PortalQueriesAutomationService.name,
            type: 'PORTAL_PHASE1',
            status: 'Warning',
            message: 'Radicado encontrado pero el demandante no corresponde a nuestra empresa — descartando',
            meta: { filingNumber: extracted.filingNumber, demandante: extracted.demandante, companyName: params.companyName },
          });
          return { available: true, found: false, multipleResults: false };
        }
      }

      return {
        available: true,
        found: true,
        multipleResults: false,
        filingNumber: extracted.filingNumber,
        filingDate: extracted.filingDate,
        filingDateAction: extracted.filingDateAction,
      };
    } catch (err) {
      this.logWarn('phase1', err);
      return unavailable(errMsg(err));
    } finally {
      await this.closeBrowser();
    }
  }

  // ─── Phase 2: buscar por nombre o razón social (Vuetify SPA) ─────────────────
  // Parámetros: naturalPerson, departament (fallback court_department), city (fallback court_city).
  // Especialidad, despacho y entidad NO aplican en esta fase.
  //
  // Lógica de ciudad:
  //   1. Descubre las opciones del select Ciudad que coincidan con params.city (tras cargar Departamento).
  //   2. Si hay exactamente 2 coincidencias las prueba en orden: si la primera no arroja resultados
  //      intenta la segunda. Si hay 1 o >2 coincidencias usa solo la primera.
  //   3. Aumenta la espera post-departamento a WAIT_AFTER_DEPT_MS para dar tiempo a la carga asíncrona.

  async runPhase2(params: Phase2Params): Promise<PortalPhaseResult> {
    const variants = generateNameVariants(params.naturalPerson);
    if (variants.length === 0) {
      return { available: true, found: false, multipleResults: false, errorDetail: 'Nombre no disponible para búsqueda' };
    }

    let page: Page;
    try {
      page = await this.openPage();
    } catch (err) {
      this.logWarn('phase2_launch', err);
      await this.closeBrowser();
      return unavailable(errMsg(err));
    }
    this.appLogger.structured({
      level: 'debug',
      context: PortalQueriesAutomationService.name,
      type: 'PORTAL_PHASE2',
      status: 'Info',
      message: 'Iniciando Fase 2 — parámetros de búsqueda',
      meta: {
        variants,
        departament: params.departament,
        city: params.city,
        companyName: params.companyName,
      },
    });

    try {
      // Navega una vez para descubrir qué opciones de ciudad están disponibles en el portal.
      // Si hay exactamente 2 que empiecen con params.city se usan ambas; en otro caso solo la primera.
      const cityOptions = await this.discoverCityOptions(page, params);

      this.appLogger.structured({
        level: 'debug',
        context: PortalQueriesAutomationService.name,
        type: 'PORTAL_PHASE2',
        status: 'Info',
        message: 'Opciones de ciudad detectadas',
        meta: { cityOptions, requestedCity: params.city ?? null },
      });

      for (const nameVariant of variants) {
        const { result, breakAll } = await this.tryNameVariantWithCities(page, nameVariant, cityOptions, params);
        if (result !== null) return result;
        if (breakAll) break;
      }

      return { available: true, found: false, multipleResults: false };
    } catch (err) {
      this.logWarn('phase2', err);
      return unavailable(errMsg(err));
    } finally {
      await this.closeBrowser();
    }
  }

  // ─── Phase 2 — descubrimiento de ciudades ─────────────────────────────────

  /**
   * Navega a NombreRazonSocial, selecciona el departamento y abre el dropdown de Ciudad
   * para leer qué opciones coinciden con params.city (texto normalizado, prefijo exacto).
   * Devuelve el subconjunto a intentar:
   *   - 0 coincidencias → [params.city]  (fallback; la selección puede fallar silenciosamente)
   *   - 1 coincidencia  → [opción]
   *   - 2 coincidencias → [opción1, opción2]  ← se probarán en orden
   *   - >2 coincidencias→ [opción1]            (demasiadas ambigüedades, solo la más exacta)
   */
  private async discoverCityOptions(page: Page, params: Phase2Params): Promise<string[]> {
    const city = params.city;
    const dept = params.departament;
    if (!city || city === '-') return ['-'];
    if (!dept || dept === '-') return [city];

    try {
      const available = await this.navigateTo(page, '/Procesos/NombreRazonSocial');
      if (!available) return [city];

      await page.waitForSelector('.v-input__slot[role="button"]', { timeout: PAGE_TIMEOUT_MS }).catch(() => {});
      await this.sleep(500);

      // Orden exacto del formulario: radio → tipo persona → nombre → departamento
      await this.selectTodosLosProcesos(page);
      await this.sleep(500);

      await this.vuetifySelectByLabel(page, 'Tipo de Persona', 'Natural');
      await this.sleep(WAIT_BETWEEN_SELECTS_MS);

      await this.fillP2Nombre(page, params.naturalPerson);
      await this.sleep(WAIT_BETWEEN_SELECTS_MS);

      const deptOk = await this.vuetifySelectByLabel(page, 'Departamento', dept);
      if (!deptOk) return [city];

      await this.sleep(WAIT_BETWEEN_SELECTS_MS);

      const options = await this.readCityDropdownOptions(page, city);

      if (options.length === 0 || options.length > 2) return [city];
      return options;
    } catch {
      return [city];
    }
  }

  /**
   * Abre el Vuetify v-select de Ciudad (asume que ya está en la página con el departamento
   * seleccionado), lee las opciones cuyo texto normalizado coincide con cityText como prefijo
   * y cierra el dropdown con Escape.
   * Devuelve los textos originales de las opciones coincidentes.
   */
  private async readCityDropdownOptions(page: Page, cityText: string): Promise<string[]> {
    const CITY_ATTR = 'data-pw-city-discover';
    try {
      const found = await page.evaluate((attr: string) => {
        const slots = Array.from(document.querySelectorAll<HTMLElement>('.v-input__slot[role="button"]'));
        const slot = slots.find((s) => {
          const lbl = s.querySelector('label');
          return lbl && (lbl.textContent ?? '').trim().toLowerCase().includes('ciudad');
        });
        if (!slot) return false;
        slot.setAttribute(attr, '1');
        return true;
      }, CITY_ATTR);

      if (!found) return [];

      const el = await page.$(`[${CITY_ATTR}="1"]`);
      if (!el) return [];
      await el.click();
      await page.evaluate((attr: string) => {
        document.querySelector(`[${attr}="1"]`)?.removeAttribute(attr);
      }, CITY_ATTR).catch(() => {});

      await page
        .waitForSelector('.v-menu__content .v-list-item', { visible: true, timeout: 3_000 })
        .catch(() => {});
      await this.sleep(200);

      const normCity = cityText
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9\s]/g, '')
        .trim();

      const options: string[] = await page.evaluate((norm: string) => {
        const items = Array.from(document.querySelectorAll<HTMLElement>(
          '.v-menu__content .v-list-item, .v-menu__content [role="option"]',
        ));
        return items
          .map((item) => ({
            raw: (item.textContent ?? '').trim(),
            norm: (item.textContent ?? '')
              .toUpperCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/[^A-Z0-9\s]/g, '')
              .trim(),
          }))
          .filter(({ norm }) => norm === normCity || norm.startsWith(normCity + ' '))
          .map(({ raw }) => raw);
      }, normCity);

      await page.keyboard.press('Escape').catch(() => {});
      await this.sleep(300);

      return options;
    } catch {
      await page.keyboard.press('Escape').catch(() => {});
      return [];
    }
  }

  // ─── Phase 2 — intento por variante de nombre × opciones de ciudad ───────

  /**
   * Prueba una variante de nombre contra cada opción de ciudad en orden.
   * Retorna:
   *   result !== null  → radicado encontrado o error de portal (salir del loop de variantes)
   *   breakAll = true  → todas las ciudades dieron "sin resultados explícitos" (saltar variantes restantes)
   *   result = null, breakAll = false → no encontrado, probar siguiente variante de nombre
   */
  private async tryNameVariantWithCities(
    page: Page,
    nameVariant: string,
    cityOptions: string[],
    params: Phase2Params,
  ): Promise<{ result: PortalPhaseResult | null; breakAll: boolean }> {
    let allExplicitNoResults = true;

    for (const cityOption of cityOptions) {
      const available = await this.navigateTo(page, '/Procesos/NombreRazonSocial');
      if (!available) {
        return { result: unavailable('Portal no disponible en /NombreRazonSocial'), breakAll: true };
      }

      await page.waitForSelector('.v-input__slot[role="button"]', { timeout: PAGE_TIMEOUT_MS }).catch(() => {});
      await this.sleep(500);

      await this.selectTodosLosProcesos(page);
      await this.sleep(500);

      await this.vuetifySelectByLabel(page, 'Tipo de Persona', 'Natural');
      await this.sleep(WAIT_BETWEEN_SELECTS_MS);

      await this.fillP2Nombre(page, nameVariant);
      await this.sleep(WAIT_BETWEEN_SELECTS_MS);

      if (params.departament && params.departament !== '-') {
        const ok = await this.vuetifySelectByLabel(page, 'Departamento', params.departament);
        if (ok) await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }

      if (cityOption && cityOption !== '-') {
        await this.vuetifySelectByLabel(page, 'Ciudad', cityOption);
        await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const btn = btns.find((b) => {
          const txt = (b.textContent ?? '').trim().toUpperCase();
          return txt === 'CONSULTAR' || txt === 'BUSCAR';
        });
        if (btn) btn.scrollIntoView({ block: 'center' });
      }).catch(() => {});
      await this.sleep(WAIT_BETWEEN_SELECTS_MS);

      await this.clickP2Consultar(page);
      const extracted = await this.waitForPhase2Results(page);

      if (extracted.portalError) {
        return { result: unavailable(extracted.portalError), breakAll: true };
      }

      if (!extracted.explicitNoResults) allExplicitNoResults = false;

      if (extracted.explicitNoResults) {
        this.appLogger.structured({
          level: 'debug',
          context: PortalQueriesAutomationService.name,
          type: 'PORTAL_PHASE2',
          status: 'Info',
          message: 'Sin resultados explícitos para combinación nombre + ciudad',
          meta: { nameVariant, cityOption },
        });
        continue;
      }

      if (extracted.count === 0) continue;

      if (extracted.count > 1) {
        if (params.companyName && params.companyName !== '-' && params.companyName.trim() !== '') {
          const filtered = await this.filterRowsByCompanyName(page, params.companyName);
          if (filtered.count === 1) {
            this.appLogger.structured({
              level: 'debug',
              context: PortalQueriesAutomationService.name,
              type: 'PORTAL_PHASE2',
              status: 'OK',
              message: 'Múltiples resultados filtrados por nombre de empresa — único resultado identificado',
              meta: { companyName: params.companyName, filingNumber: filtered.filingNumber },
            });
            return {
              result: {
                available: true,
                found: true,
                multipleResults: false,
                filingNumber: filtered.filingNumber,
                filingDate: filtered.filingDate,
                filingDateAction: filtered.filingDateAction,
              },
              breakAll: false,
            };
          }
          if (filtered.count === 0) {
            this.appLogger.structured({
              level: 'debug',
              context: PortalQueriesAutomationService.name,
              type: 'PORTAL_PHASE2',
              status: 'Info',
              message: 'Múltiples resultados del portal pero ninguno corresponde a nuestra empresa — probando siguiente variante/ciudad',
              meta: { companyName: params.companyName, nameVariant, cityOption, portalCount: extracted.count },
            });
            continue;
          }
          // filtered.count > 1: varias filas coinciden con nuestra empresa → control manual
        }
        return { result: { available: true, found: false, multipleResults: true }, breakAll: false };
      }

      // Resultado único: validar que el demandante sea nuestra empresa antes de aceptarlo
      if (params.companyName && params.companyName !== '-' && params.companyName.trim() !== '' && extracted.demandante) {
        if (!this.matchesDemandante(extracted.demandante, params.companyName)) {
          this.appLogger.structured({
            level: 'warn',
            context: PortalQueriesAutomationService.name,
            type: 'PORTAL_PHASE2',
            status: 'Warning',
            message: 'Resultado único encontrado pero el demandante no corresponde a nuestra empresa — descartando',
            meta: { nameVariant, cityOption, demandante: extracted.demandante, companyName: params.companyName },
          });
          continue;
        }
      }

      this.appLogger.structured({
        level: 'debug',
        context: PortalQueriesAutomationService.name,
        type: 'PORTAL_PHASE2',
        status: 'OK',
        message: 'Radicado encontrado con variante de nombre',
        meta: { nameVariant, cityOption, filingNumber: extracted.filingNumber },
      });

      return {
        result: {
          available: true,
          found: true,
          multipleResults: false,
          filingNumber: extracted.filingNumber,
          filingDate: extracted.filingDate,
          filingDateAction: extracted.filingDateAction,
        },
        breakAll: false,
      };
    }

    return { result: null, breakAll: allExplicitNoResults };
  }

  // ─── Phase 3: construir número de radicado ─────────────────────────────────

  async runPhase3(params: Phase3Params): Promise<PortalPhaseResult> {
    let page: Page;
    try {
      page = await this.openPage();
    } catch (err) {
      this.logWarn('phase3_launch', err);
      await this.closeBrowser();
      return unavailable(errMsg(err));
    }
    try {
      const available = await this.navigateTo(page, '/Procesos/ConstruirNumeroRadicacion');
      if (!available) return unavailable('Portal no disponible en /ConstruirNumeroRadicacion');

      if (params.departament && params.departament !== '-') {
        const ok = await this.selectOption(page, SEL.p3Dept, params.departament);
        if (ok) await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }
      if (params.city && params.city !== '-') {
        const ok = await this.selectOption(page, SEL.p3Ciudad, params.city);
        if (ok) await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }
      if (params.courtName && params.courtName !== '-') {
        const ok = await this.selectOption(page, SEL.p3Juzgado, params.courtName);
        if (ok) await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }
      if (params.specialty && params.specialty !== '-') {
        await this.selectOption(page, SEL.p3Especialidad, params.specialty);
        await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }
      if (params.officeName && params.officeName !== '-') {
        const ok = await this.selectOption(page, SEL.p3Despacho, params.officeName);
        if (ok) await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }
      if (params.year) {
        await this.selectOption(page, SEL.p3Anio, params.year);
        await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }
      if (params.processCode) {
        await this.selectOption(page, SEL.p3CodProceso, params.processCode);
        await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }
      if (params.processResource) {
        await this.selectOption(page, SEL.p3Recurso, params.processResource);
        await this.sleep(WAIT_BETWEEN_SELECTS_MS);
      }

      await this.clickSearch(page, SEL.p3BtnBuscar);
      const extracted = await this.extractResults(page);

      if (extracted.portalError) {
        return unavailable(extracted.portalError);
      }

      if (extracted.count === 0) {
        return { available: true, found: false, multipleResults: false };
      }
      if (extracted.count > 1) {
        return { available: true, found: false, multipleResults: true };
      }
      return {
        available: true,
        found: true,
        multipleResults: false,
        filingNumber: extracted.filingNumber,
        filingDate: extracted.filingDate,
        filingDateAction: extracted.filingDateAction,
      };
    } catch (err) {
      this.logWarn('phase3', err);
      return unavailable(errMsg(err));
    } finally {
      await this.closeBrowser();
    }
  }

  // ─── Phase 1 helpers ──────────────────────────────────────────────────────

  private async selectTodosLosProcesos(page: Page): Promise<void> {
    try {
      const clicked = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const match = labels.find((l) => l.textContent?.includes('Todos los Procesos'));
        if (match) { match.click(); return true; }
        return false;
      });
      if (!clicked) {
        await page.evaluate(() => {
          const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
          const r = radios.find((el) => el.value === 'false' || el.id === 'input-113');
          if (r) r.click();
        });
      }
    } catch { /* continuar si el radio no existe */ }
  }

  private async fillPhase1Input(page: Page, value: string): Promise<void> {
    for (const sel of SEL.p1Input.split(',').map((s) => s.trim())) {
      try {
        const el = await page.$(sel);
        if (!el) continue;
        await page.focus(sel);
        await el.click({ clickCount: 3 });
        await el.type(value, { delay: 30 });
        return;
      } catch { /* intentar siguiente selector */ }
    }
  }

  private async clickPhase1Consultar(page: Page): Promise<void> {
    try {
      const btn = await page.$(SEL.p1BtnConsultar);
      if (btn) {
        await btn.click();
        return;
      }
      // Fallback: buscar por texto del botón
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const match = btns.find((b) => b.textContent?.trim() === 'Consultar');
        if (match) match.click();
      });
    } catch { /* continuar */ }
  }

  /**
   * Detecta el diálogo de error que muestra el portal cuando su propio backend falla
   * (ej: "Error: timeout of 50000ms exceeded"). Retorna el texto del error o null si no hay diálogo.
   */
  private async checkPortalErrorDialog(page: Page): Promise<string | null> {
    return page.evaluate((sel) => {
      const p = document.querySelector(sel);
      if (!p) return null;
      const txt = (p.textContent ?? '').trim();
      if (!txt) return null;
      // Mensajes informativos del portal — no son errores técnicos; los manejan sus propios checks
      if (txt.includes('La consulta no generó resultados')) return null;
      if (txt.includes('varios registros con el mismo nombre')) return null;
      return txt;
    }, SEL.portalErrorMsg).catch(() => null);
  }

  /**
   * Espera resultados de Phase 1:
   * 1) Espera INITIAL_WAIT_MS para que la SPA lance la petición al servidor.
   * 2) Verifica cada POLL_INTERVAL_MS si ya hay filas con radicado.
   * 3) En cuanto detecta resultado lo retorna inmediatamente.
   * 4) Si agota PORTAL_QUERY_WAIT_TIME sin resultado, retorna count=0.
   */
  private async waitForPhase1Results(page: Page): Promise<ExtractedResult> {
    const maxWaitMs = this.getQueryWaitMs();
    const deadline = Date.now() + maxWaitMs;

    // Espera inicial para que la SPA procese el click y lance la petición HTTP
    await this.sleep(INITIAL_WAIT_MS);

    while (true) {
      const portalError = await this.checkPortalErrorDialog(page);
      if (portalError) {
        return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '', portalError };
      }

      const hasRows = await page.evaluate((sel) => {
        const rows = Array.from(document.querySelectorAll(sel));
        return rows.some((tr) => tr.querySelector('button.blue--text'));
      }, SEL.p1ResultRows).catch(() => false);

      if (hasRows) return this.extractPhase1Results(page);

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      await this.sleep(Math.min(POLL_INTERVAL_MS, remaining));
    }

    // Tiempo agotado sin resultado
    return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };
  }

  /**
   * Igual que waitForPhase1Results pero también detecta el alert Vuetify de
   * "La consulta no generó resultados". Cuando ese alert aparece se retorna
   * inmediatamente con explicitNoResults=true para cortar el loop de variantes.
   */
  private async waitForPhase2Results(page: Page): Promise<Phase2ExtractedResult> {
    const maxWaitMs = this.getQueryWaitMs();
    const deadline = Date.now() + maxWaitMs;

    await this.sleep(INITIAL_WAIT_MS);

    while (true) {
      const portalError = await this.checkPortalErrorDialog(page);
      if (portalError) {
        return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '', explicitNoResults: false, portalError };
      }

      const noResults = await page.evaluate((alertSel, dialogSel) => {
        const needle = 'La consulta no generó resultados';
        const alertEls = Array.from(document.querySelectorAll(alertSel));
        if (alertEls.some((el) => (el.textContent ?? '').includes(needle))) return true;
        const dialogP = document.querySelector(dialogSel);
        return !!dialogP && (dialogP.textContent ?? '').includes(needle);
      }, SEL.p2NoResults, SEL.portalErrorMsg).catch(() => false);

      if (noResults) {
        // Cerrar el diálogo modal si es quien contiene el mensaje
        await page.evaluate(() => {
          const dialog = document.querySelector<HTMLElement>('div[role="dialog"][aria-modal="true"]');
          const btn = dialog?.querySelector<HTMLButtonElement>('button');
          if (btn) btn.click();
        }).catch(() => {});
        return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '', explicitNoResults: true };
      }

      // Detectar y descartar el diálogo "varios registros con el mismo nombre o razón social"
      const hasDialog = await page.evaluate((sel) => {
        const dialog = document.querySelector<HTMLElement>(sel);
        if (!dialog) return false;
        const p = dialog.querySelector('p');
        return !!p && (p.textContent ?? '').includes('varios registros');
      }, SEL.p2MultipleDialog).catch(() => false);

      if (hasDialog) {
        await page.evaluate((sel) => {
          const dialog = document.querySelector(sel);
          const btn = dialog?.querySelector<HTMLButtonElement>('button');
          if (btn) btn.click();
        }, SEL.p2MultipleDialog).catch(() => {});
        await this.sleep(1_000);
        continue;
      }

      const hasRows = await page.evaluate((sel) => {
        const rows = Array.from(document.querySelectorAll(sel));
        return rows.some((tr) => tr.querySelector('button.blue--text'));
      }, SEL.p1ResultRows).catch(() => false);

      if (hasRows) {
        const result = await this.extractPhase1Results(page);
        return { ...result, explicitNoResults: false };
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      await this.sleep(Math.min(POLL_INTERVAL_MS, remaining));
    }

    return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '', explicitNoResults: false };
  }

  /**
   * Extrae número de radicado y fechas del DOM Vuetify de Phase 1.
   * - Número: botón .v-btn__content en la 2da columna (23 dígitos).
   * - Fecha radicación: nodo texto antes del <br> en la 3ra columna.
   * - Fecha última actuación: botón .v-btn__content en la 3ra columna.
   */
  private extractPhase1Results(page: Page): Promise<ExtractedResult> {
    return page.evaluate((rowsSel) => {
      const rows = Array.from(document.querySelectorAll(rowsSel));
      if (rows.length === 0) return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };

      const filingNumbers: string[] = [];
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        const numText = cells[1]?.querySelector('.v-btn__content')?.textContent?.trim() ?? '';
        if (/^\d{23}$/.test(numText) && !filingNumbers.includes(numText)) {
          filingNumbers.push(numText);
        }
      }

      if (filingNumbers.length === 0) return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };

      const firstRow = rows.find((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells[1]?.querySelector('.v-btn__content')?.textContent?.trim() === filingNumbers[0];
      });

      let filingDate = '';
      let filingDateAction = '';
      let demandante = '';

      if (firstRow) {
        const cells = Array.from(firstRow.querySelectorAll('td'));
        const dateDiv = cells[2]?.querySelector('div');
        if (dateDiv) {
          // Primera fecha: nodo texto plano antes del <br>
          for (const node of Array.from(dateDiv.childNodes)) {
            if (node.nodeType === 3 /* TEXT_NODE */) {
              const text = (node.textContent ?? '').trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(text)) { filingDate = text; break; }
            }
          }
          // Segunda fecha: texto del botón en la misma celda
          filingDateAction = dateDiv.querySelector('button .v-btn__content')?.textContent?.trim() ?? '';
        }

        // Demandante: extraído de la columna Sujetos Procesales (<b>Demandante</b>: NOMBRE)
        const bTags = Array.from(firstRow.querySelectorAll('b'));
        const bTag = bTags.find((b) => (b.textContent ?? '').trim().toLowerCase() === 'demandante');
        if (bTag) {
          let node = bTag.nextSibling;
          let txt = '';
          while (node && node.nodeType === 3 /* TEXT_NODE */) {
            txt += node.textContent ?? '';
            node = node.nextSibling;
          }
          demandante = txt.replace(/^:\s*/, '').trim();
        }
      }

      return { count: filingNumbers.length, filingNumber: filingNumbers[0], filingDate, filingDateAction, demandante };
    }, SEL.p1ResultRows);
  }

  private getQueryWaitMs(): number {
    const v = this.configService.get<number>('PORTAL_QUERY_WAIT_TIME', 30);
    const n = Number(v);
    return (Number.isFinite(n) && n > 0 ? n : 30) * 1_000;
  }

  // ─── Browser / Page helpers ────────────────────────────────────────────────

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) return this.browser;
    this.browser = await puppeteer.launch({
      headless: !this.showBrowser,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      defaultViewport: { width: 1280, height: 800 },
    });
    return this.browser;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  private async openPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
    return page;
  }

  private async navigateTo(page: Page, path: string): Promise<boolean> {
    const url = `${this.baseUrl}${path}`;
    try {
      const response = await page.goto(url, { waitUntil: WAIT_LOAD, timeout: PAGE_TIMEOUT_MS });
      const ok = response?.ok() ?? false;
      if (!ok) {
        this.appLogger.structured({
          level: 'warn',
          context: PortalQueriesAutomationService.name,
          type: 'PORTAL_AUTOMATION',
          status: 'Warning',
          message: `Portal respondió con estado no exitoso en ${path}`,
          meta: { url, httpStatus: response?.status() ?? null, httpStatusText: response?.statusText() ?? null },
        });
      }
      return ok;
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: PortalQueriesAutomationService.name,
        type: 'PORTAL_AUTOMATION',
        status: 'Warning',
        message: `Error de navegación al portal en ${path}`,
        meta: { url, error: errMsg(err) },
      });
      return false;
    }
  }

  // ─── Phase 2 helpers (Vuetify SPA) ────────────────────────────────────────

  /**
   * Rellena el campo "Nombre(s) Apellido o Razón Social" en la página de NombreRazonSocial.
   * Busca el input por contexto de label Vuetify para no depender de IDs generados dinámicamente.
   */
  private async fillP2Nombre(page: Page, value: string): Promise<void> {
    try {
      const tmpId = '__p2nombre__';
      const sel: string = await page.evaluate((id) => {
        const labels = Array.from(document.querySelectorAll('.v-text-field .v-label, .v-input .v-label'));
        const label = labels.find((l) => {
          const txt = (l.textContent ?? '').toLowerCase();
          return txt.includes('nombre') || txt.includes('raz');
        });
        const slot = label?.closest('.v-input__slot');
        const input = slot?.querySelector<HTMLInputElement>('input[type="text"]:not([readonly])');
        if (input) {
          if (!input.id) input.id = id;
          return `#${input.id}`;
        }
        return `#${id}`;
      }, tmpId) as string;

      const el = await page.$(sel);
      if (el) {
        await el.click({ clickCount: 3 });
        await el.type(value, { delay: 30 });
      }
    } catch { /* continuar */ }
  }

  /**
   * Abre un Vuetify v-select por texto de su label usando Puppeteer ElementHandle.click()
   * (dispatcha mousemove + mousedown + mouseup + click — fiable en Vuetify 2.x).
   */
  private async vuetifySelectByLabel(
    page: Page,
    labelText: string,
    searchText: string,
    fuzzy = false,
  ): Promise<boolean> {
    const MARKER = 'data-pw-select';
    try {
      // Marcar el elemento en el mismo evaluate para evitar race conditions con el DOM de Vuetify
      const found = await page.evaluate((lbl: string, attr: string) => {
        const slots = Array.from(document.querySelectorAll<HTMLElement>('.v-input__slot[role="button"]'));
        const slot = slots.find((s) => {
          const label = s.querySelector('label');
          return label && (label.textContent ?? '').replace(/\*/g, '').trim().toLowerCase().includes(lbl.toLowerCase());
        });
        if (!slot) return false;
        slot.setAttribute(attr, lbl);
        return true;
      }, labelText, MARKER);

      if (!found) return false;

      const slot = await page.$(`[${MARKER}="${labelText}"]`);
      if (!slot) return false;

      await slot.click();

      // Remover el marcador de inmediato (no importa si falla)
      await page.evaluate((lbl: string, attr: string) => {
        document.querySelector(`[${attr}="${lbl}"]`)?.removeAttribute(attr);
      }, labelText, MARKER).catch(() => {});

      // Timeout ampliado para dept/ciudad que cargan opciones de forma asíncrona desde el portal
      await page
        .waitForSelector('.v-menu__content .v-list-item', { visible: true, timeout: WAIT_BETWEEN_SELECTS_MS * 2 })
        .catch(() => {});
      await this.sleep(200);

      const normSearch = searchText
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9\s]/g, '')
        .trim();

      return fuzzy
        ? await this.selectBestFuzzyVuetifyOption(page, normSearch)
        : await this.selectExactVuetifyOption(page, normSearch);
    } catch {
      return false;
    }
  }

  /** Selección exacta/parcial en dropdown Vuetify abierto. */
  private async selectExactVuetifyOption(page: Page, normSearch: string): Promise<boolean> {
    return page.evaluate((norm) => {
      const items = Array.from(document.querySelectorAll(
        '.v-menu__content .v-list-item, .v-menu__content [role="option"]',
      ));
      if (items.length === 0) return false;

      let best: Element | null = null;
      let bestScore = -1;

      for (const item of items) {
        const text = (item.textContent ?? '')
          .toUpperCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^A-Z0-9\s]/g, '')
          .trim();

        if (text === norm) { best = item; bestScore = 3; break; }
        if (text.includes(norm) && 2 > bestScore) { best = item; bestScore = 2; }
        if (norm.includes(text) && text.length > 2 && 1 > bestScore) { best = item; bestScore = 1; }
      }

      if (best) { (best as HTMLElement).click(); return true; }
      return false;
    }, normSearch);
  }

  /**
   * Selección difusa por solapamiento de palabras en dropdown Vuetify abierto.
   * Maneja casos como "JUZGADO CIVIL MUNICIPAL" en BD vs "JUZGADO MUNICIPAL" en portal.
   */
  private async selectBestFuzzyVuetifyOption(page: Page, normSearch: string): Promise<boolean> {
    return page.evaluate((norm) => {
      const items = Array.from(document.querySelectorAll(
        '.v-menu__content .v-list-item, .v-menu__content [role="option"]',
      ));
      if (items.length === 0) return false;

      const searchWords = norm.split(/\s+/).filter(Boolean);
      let best: Element | null = null;
      let bestScore = 0;

      for (const item of items) {
        const text = (item.textContent ?? '')
          .toUpperCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^A-Z0-9\s]/g, '')
          .trim();

        const optWords = text.split(/\s+/).filter(Boolean);
        const matchCount = searchWords.filter((w) => optWords.includes(w)).length;
        if (matchCount === 0) continue;

        const unionSize = new Set([...searchWords, ...optWords]).size;
        const score = matchCount / unionSize;

        if (score > bestScore) { bestScore = score; best = item; }
      }

      if (best && bestScore > 0) { (best as HTMLElement).click(); return true; }
      return false;
    }, normSearch);
  }

  /**
   * Valida que el demandante extraído del portal corresponda a alguno de los nombres de empresa.
   * Aplica la misma normalización (sin tilde, sin sufijos jurídicos) usada en filterRowsByCompanyName.
   */
  private matchesDemandante(demandante: string, companyName: string): boolean {
    const LEGAL_SUFFIXES = /\b(S\.?A\.?S\.?|S\.?A\.?|LTDA\.?|SCS|SNC|EU|EIRL|EP|CORP|INC|LLC)\b/g;
    const norm = (s: string): string =>
      s.toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(LEGAL_SUFFIXES, '')
        .replace(/\s+/g, ' ')
        .trim();
    const normDemandante = norm(demandante);
    return companyName
      .split(',')
      .map((n) => norm(n))
      .filter(Boolean)
      .some((n) => normDemandante.includes(n));
  }

  /**
   * Cuando la Fase 2 devuelve múltiples resultados, filtra las filas buscando cualquiera
   * de los nombres de empresa (lista separada por coma, equivale a Ctrl+F en navegador).
   * Quita sufijos jurídicos (SAS, SA, LTDA...) de cada nombre antes de comparar.
   * Si exactamente UNA fila coincide con alguno de los nombres → la retorna.
   */
  private async filterRowsByCompanyName(page: Page, companyName: string): Promise<ExtractedResult> {
    const LEGAL_SUFFIXES = /\b(S\.?A\.?S\.?|S\.?A\.?|LTDA\.?|SCS|SNC|EU|EIRL|EP|CORP|INC|LLC)\b/g;

    const normalizeStr = (s: string): string =>
      s.toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(LEGAL_SUFFIXES, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizedNames = companyName
      .split(',')
      .map((n) => normalizeStr(n))
      .filter(Boolean);

    if (normalizedNames.length === 0) {
      return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };
    }

    return page.evaluate(
      (rowsSel, compNames) => {
        interface MatchedRow { filingNumber: string; filingDate: string; filingDateAction: string; }

        const normText = (str: string): string =>
          str.toUpperCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        /**
         * Extrae el texto del campo Demandante dentro de la celda Sujetos Procesales.
         * Formato DOM: <b>Demandante</b>: NOMBRE DE LA EMPRESA
         */
        const getDemandante = (row: Element): string => {
          const bTags = Array.from(row.querySelectorAll('b'));
          const tag = bTags.find((b) => (b.textContent ?? '').trim().toLowerCase() === 'demandante');
          if (!tag) return '';
          let node = tag.nextSibling;
          let txt = '';
          while (node && node.nodeType === 3 /* TEXT_NODE */) {
            txt += node.textContent ?? '';
            node = node.nextSibling;
          }
          return txt.replace(/^:\s*/, '').trim();
        };

        const rows = Array.from(document.querySelectorAll(rowsSel));
        const matched: MatchedRow[] = [];

        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));
          const numText = cells[1]?.querySelector('.v-btn__content')?.textContent?.trim() ?? '';
          if (!/^\d{23}$/.test(numText)) continue;
          if (matched.some((m) => m.filingNumber === numText)) continue;

          // Buscar en el campo Demandante del registro (columna Sujetos Procesales)
          const demandante = normText(getDemandante(row));
          if (!compNames.some((cn) => demandante.includes(cn))) continue;

          let filingDate = '';
          let filingDateAction = '';
          const dateDiv = cells[2]?.querySelector('div');
          if (dateDiv) {
            for (const node of Array.from(dateDiv.childNodes)) {
              if (node.nodeType === 3) {
                const text = (node.textContent ?? '').trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(text)) { filingDate = text; break; }
              }
            }
            filingDateAction = dateDiv.querySelector('button .v-btn__content')?.textContent?.trim() ?? '';
          }

          matched.push({ filingNumber: numText, filingDate, filingDateAction });
        }

        if (matched.length !== 1) {
          return { count: matched.length === 0 ? 0 : matched.length, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };
        }
        return { count: 1, filingNumber: matched[0].filingNumber, filingDate: matched[0].filingDate, filingDateAction: matched[0].filingDateAction, demandante: '' };
      },
      SEL.p1ResultRows,
      normalizedNames,
    );
  }

  /** Click en el botón "Consultar" de la página NombreRazonSocial (Vuetify). */
  private async clickP2Consultar(page: Page): Promise<void> {
    try {
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const match = btns.find((b) => {
          const txt = (b.textContent ?? '').trim().toUpperCase();
          return txt === 'CONSULTAR' || txt === 'BUSCAR';
        });
        if (match) { match.click(); return true; }
        return false;
      });
      if (!clicked) {
        // Fallback: primer botón elevado habilitado
        await page.evaluate(() => {
          const btn = document.querySelector<HTMLElement>('button.v-btn:not([disabled])');
          if (btn) btn.click();
        });
      }
    } catch { /* continuar */ }
  }

  // ─── Interaction helpers ───────────────────────────────────────────────────

  private async clickSearch(page: Page, selector: string): Promise<void> {
    const btn = await page.$(selector);
    if (!btn) return;
    await Promise.all([
      page.waitForNavigation({ waitUntil: WAIT_LOAD, timeout: PAGE_TIMEOUT_MS }).catch(() => {}),
      btn.click(),
    ]);
    // Esperar que los resultados o el mensaje sin resultados sean visibles
    await page
      .waitForSelector(`${SEL.resultTable}, ${SEL.noResults}`, { timeout: PAGE_TIMEOUT_MS })
      .catch(() => {});
  }

  /**
   * Selecciona una opción en un <select> por texto normalizado.
   * Devuelve true si encontró y seleccionó la opción.
   */
  private async selectOption(page: Page, selector: string, text: string): Promise<boolean> {
    const normText = normalize(text.toUpperCase());
    try {
      const value: string | null = await page.$eval(
        selector,
        (el, norm) => {
          const sel = el as HTMLSelectElement;
          for (const opt of Array.from(sel.options)) {
            const optNorm = opt.text
              .toUpperCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/[^A-Z0-9\s]/g, '')
              .trim();
            if (optNorm === norm || optNorm.includes(norm) || norm.includes(optNorm)) {
              return opt.value;
            }
          }
          return null;
        },
        normText,
      );
      if (value !== null) {
        await page.select(selector, value);
        return true;
      }
    } catch { /* selector no encontrado en el DOM */ }
    return false;
  }

  // ─── Result extraction ─────────────────────────────────────────────────────

  private async extractResults(page: Page): Promise<ExtractedResult> {
    try {
      const portalError = await this.checkPortalErrorDialog(page);
      if (portalError) {
        return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '', portalError };
      }

      const noResultsEl = await page.$(SEL.noResults);
      if (noResultsEl) {
        return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };
      }

      const tableEl = await page.$(SEL.resultTable);
      if (!tableEl) {
        return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };
      }

      // Extraer texto de todas las celdas de cada fila
      const rows: string[][] = await page.$$eval(
        `${SEL.resultTable} tbody tr`,
        (trs) =>
          trs.map((tr) =>
            Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim()),
          ),
      );

      // Filing number: exactamente 23 dígitos
      const filingNumbers = [...new Set(
        rows.flatMap((cells) => cells.filter((c) => /^\d{23}$/.test(c))),
      )];

      if (filingNumbers.length === 0) {
        return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };
      }

      // Fechas: buscar en la primera fila que tenga el primer número de radicado
      const firstRow = rows.find((cells) => cells.some((c) => c === filingNumbers[0])) ?? [];
      const dates = firstRow.filter(
        (c) => /^\d{4}-\d{2}-\d{2}$/.test(c) || /^\d{2}\/\d{2}\/\d{4}$/.test(c),
      );

      return {
        count: filingNumbers.length,
        filingNumber: filingNumbers[0],
        filingDate: dates[0] ?? '',
        filingDateAction: dates[1] ?? '',
        demandante: '',
      };
    } catch {
      return { count: 0, filingNumber: '', filingDate: '', filingDateAction: '', demandante: '' };
    }
  }

  // ─── Misc ─────────────────────────────────────────────────────────────────

  private logWarn(phase: string, err: unknown): void {
    this.appLogger.structured({
      level: 'warn',
      context: PortalQueriesAutomationService.name,
      type: 'PORTAL_AUTOMATION',
      status: 'Warning',
      message: `Error en ${phase} del portal de consultas.`,
      meta: { error: errMsg(err) },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function unavailable(errorDetail: string): PortalPhaseResult {
  return { available: false, found: false, multipleResults: false, errorDetail };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
