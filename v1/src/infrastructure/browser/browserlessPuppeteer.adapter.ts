import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';

import {
  BrowserAutomationPort,
  LugarEnvioYProcesoInput,
  ProcesarLugarEnvioResult,
} from '@domain/ports/browserAutomation.ports';
import { DEMAND_PDF_PORT, DemandPdfPort } from '@domain/ports/demandPdf.ports';
import { ManagementDemandsOnline } from '@domain/entities/managementDemandsOnline.entities';
import {
  MANAGEMENT_DEMANDS_ONLINE_REPOSITORY,
  ManagementDemandsOnlineRepository,
} from '@domain/ports/managementDemandsOnline.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';
import { BrowserlessHealthService } from '@infrastructure/browser/browserlessHealth.service';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class BrowserlessPuppeteerAdapter implements BrowserAutomationPort, OnModuleInit {
  private readonly tmpBaseDir = path.join(process.cwd(), 'tmp');

  constructor(
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
    private readonly browserlessHealth: BrowserlessHealthService,
    @Inject(MANAGEMENT_DEMANDS_ONLINE_REPOSITORY)
    private readonly managementDemandsOnlineRepository: ManagementDemandsOnlineRepository,
    @Inject(DEMAND_PDF_PORT)
    private readonly demandPdfPort: DemandPdfPort,
  ) {}

  onModuleInit(): void {
    fs.mkdirSync(this.tmpBaseDir, { recursive: true });
  }

  /** Escribe solo detail + updated_at en BD para que listados/polling vean el paso actual. */
  private async persistAutomationDetail(id: number, detail: string): Promise<void> {
    this.appLogger.structured({
      level: 'log',
      context: BrowserlessPuppeteerAdapter.name,
      type: 'AUTOMATION',
      status: 'Info',
      message: detail,
      meta: { demandaId: id },
    });
    await this.managementDemandsOnlineRepository.updateAutomationDetail(id, detail);
  }

  /** Solo dígitos (documento / teléfono apoderado). */
  private digitsOnly(value: string | undefined | null): string {
    return (value ?? '').replace(/\D+/g, '');
  }

  private normalizeUpper(value: string | undefined | null): string {
    if (value == null) return '';
    const trimmed = value.toString().trim();
    if (!trimmed) return '';
    return trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  /**
   * Igual que fase demandante: correo en #IdEmail → Validar → esperar éxito → Continuar en ese modal → espera estable.
   * Reutilizado en fase 3 apoderado para que el portal ejecute ValidarCorreo() sobre el valor correcto.
   */
  private async ejecutarCorreoValidarContinuar(page: Page, email: string): Promise<void> {
    const emailTrim = (email ?? '').trim();
    if (!emailTrim) {
      throw new Error('email_notifications vacío: no se puede validar correo en el portal');
    }

    await delay(1000);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('#IdEmail')?.scrollIntoView({
        block: 'center',
        behavior: 'instant',
      });
    });

    const emailInput = await page.$('#IdEmail');
    if (!emailInput) {
      throw new Error('No se encontró el campo Correo para notificaciones (IdEmail)');
    }

    await emailInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#IdEmail', emailTrim, { delay: 30 });
    await page.evaluate((expected: string) => {
      const input = document.querySelector<HTMLInputElement>('#IdEmail');
      if (!input) return;
      if (input.value !== expected) input.value = expected;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }, emailTrim);

    await delay(400);
    await page.waitForSelector('#btnValidar', { timeout: 15000 });
    const validarBtn = await page.$('#btnValidar');
    if (!validarBtn) {
      throw new Error('No se encontró el botón "Validar correo para notificaciones" (#btnValidar)');
    }
    await validarBtn.evaluate((el) => {
      (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await delay(200);
    await validarBtn.click();

    await page.waitForFunction(
      () => {
        const holders = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-holder'));
        for (const h of holders) {
          const st = getComputedStyle(h);
          if (st.display === 'none' || st.visibility === 'hidden') continue;
          const content = h.querySelector<HTMLElement>('.jconfirm-content');
          if (!content) continue;
          const txt = (content.innerText || content.textContent || '').toUpperCase();
          if (txt.includes('CORREO ELECTRONICO VALIDADO CON ÉXITO')) return true;
        }
        const content = document.querySelector<HTMLElement>('.jconfirm-content');
        if (!content) return false;
        const txt = (content.innerText || content.textContent || '').toUpperCase();
        return txt.includes('CORREO ELECTRONICO VALIDADO CON ÉXITO');
      },
      { timeout: 25000 },
    );

    await delay(500);
    await page.evaluate(() => {
      const holders = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-holder'));
      for (const h of holders) {
        const st = getComputedStyle(h);
        if (st.display === 'none' || st.visibility === 'hidden') continue;
        const content = h.querySelector<HTMLElement>('.jconfirm-content');
        if (!content) continue;
        const txt = (content.innerText || content.textContent || '').toUpperCase();
        if (!txt.includes('CORREO ELECTRONICO VALIDADO CON ÉXITO')) continue;
        const buttons = Array.from(
          h.querySelectorAll<HTMLButtonElement>('.jconfirm-buttons .btn'),
        );
        const cont = buttons.find((b) =>
          /continuar/i.test((b.innerText || b.textContent || '').trim()),
        );
        if (cont) {
          cont.click();
          return;
        }
      }
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.jconfirm-buttons .btn'),
      );
      const cont = buttons.find((b) =>
        /continuar/i.test((b.innerText || b.textContent || '').trim()),
      );
      if (cont) cont.click();
    });

    await delay(1000);
  }

  async procesarLugarEnvioYEspecialidadYClase(
    input: LugarEnvioYProcesoInput,
  ): Promise<ProcesarLugarEnvioResult> {
    const browser = await this.createBrowser();
    const page = await browser.newPage();

    try {
      const rowId = input.demanda.id;
      await this.persistAutomationDetail(rowId, 'Bot: modal inicial (términos y continuar)');

      await this.navigateAndAcceptModal(page);

      await this.persistAutomationDetail(rowId, 'Bot: lugar de envío (departamento y ciudad)');

      await this.fillLugarEnvio(page, input.departamento, input.ciudad);
      // Dar tiempo a que el portal termine de cargar/normalizar los datos asociados al Lugar de Envío
      await delay(500);

      await this.persistAutomationDetail(rowId, 'Bot: especialidad y clase de proceso');

      await this.fillEspecialidadYClase(page, input.especialidades, input.clasesProceso);
      await delay(1500);

      const nitFromCompany = input.demandante?.nit?.toString().trim() ?? '';
      const notificationEmailFromCompany =
        input.demandante?.email_notifications?.toString().trim() ?? '';

      const nitCarterasPropias =
        nitFromCompany ||
        this.configService.get<string>('NIT_CARTERAS_PROPIAS')?.toString().trim() ||
        '';
      const notificationEmail =
        notificationEmailFromCompany ||
        this.configService.get<string>('DEMANDS_NOTIFICATION_EMAIL')?.toString().trim() ||
        '';

      if (!nitCarterasPropias) {
        throw new Error(
          'No se encontró NIT del demandante ni en company_type ni en la variable de entorno NIT_CARTERAS_PROPIAS',
        );
      }
      if (!notificationEmail) {
        throw new Error(
          'No se encontró correo de notificaciones ni en company_type ni en DEMANDS_NOTIFICATION_EMAIL',
        );
      }

      await this.persistAutomationDetail(rowId, 'Bot: sujetos procesales — demandante jurídico (inicio)');

      const result = await this.fillSujetosProcesalesDemandanteJuridico(
        page,
        rowId,
        input.demanda,
        {
          nit: nitCarterasPropias,
          company_name: input.demandante?.company_name ?? '',
          address: input.demandante?.address ?? '',
          contact_number: input.demandante?.contact_number ?? '',
          email_notifications: notificationEmail,
        },
        {
          document_type_name: input.demandado?.document_type_name ?? '',
          identification: input.demandado?.identification ?? '',
          first_name: input.demandado?.first_name ?? '',
          second_name: input.demandado?.second_name ?? '',
          first_last_name: input.demandado?.first_last_name ?? '',
          second_last_name: input.demandado?.second_last_name ?? '',
          completed_name: input.demandado?.completed_name ?? '',
          address: this.normalizeUpper(input.demandado?.address ?? ''),
          phone: input.demandado?.phone ?? '',
        },
        input.apoderado,
        input.pdfServiceConfig,
      );
      return result;
    } finally {
      try {
        await page.close();
      } catch {
        this.appLogger.structured({
          level: 'debug',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'No se pudo cerrar la página de Puppeteer',
        });
      }
      try {
        await browser.close();
      } catch {
        this.appLogger.structured({
          level: 'debug',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'No se pudo cerrar el browser de Puppeteer',
        });
      }
    }
  }

  private async createBrowser(): Promise<Browser> {
    const showBrowser =
      this.configService.get<string>('BROWSERLESS_SHOW_BROWSER') === 'true';

    if (showBrowser) {
      this.appLogger.structured({
        level: 'log',
        context: BrowserlessPuppeteerAdapter.name,
        type: 'BROWSER',
        status: 'OK',
        message:
          'Iniciando navegador local de Puppeteer en modo visible (BROWSERLESS_SHOW_BROWSER=true)',
      });
      return puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1366, height: 768 },
        args: ['--start-maximized'],
      });
    }

    const endpoint = this.configService.get<string>('BROWSERLESS_ENDPOINT');
    const tokenRaw = this.configService.get<string>('BROWSERLESS_API_TOKEN');

    if (!endpoint || !tokenRaw) {
      throw new Error(
        'Variables de entorno BROWSERLESS_ENDPOINT y BROWSERLESS_API_TOKEN son obligatorias',
      );
    }

    // Health-check: verifica disponibilidad del servicio y emite warnings de cuota
    const health = await this.browserlessHealth.checkHealth();
    if (!health.ok) {
      this.appLogger.structured({
        level: 'error',
        context: BrowserlessPuppeteerAdapter.name,
        type: 'BROWSERLESS_HEALTH',
        status: 'Error',
        message: `Browserless no disponible antes de conectar — razón: ${health.reason}. ${health.message}`,
        meta: { reason: health.reason },
      });
      throw new Error(`[BROWSERLESS_${health.reason}] ${health.message}`);
    }

    const token = tokenRaw.replace(/^['"]|['"]$/g, '');
    const wsBase = endpoint.replace(/^http/i, 'ws');
    const browserWSEndpoint = `${wsBase}?token=${encodeURIComponent(
      token,
    )}&solveCaptchas=true`;

    this.appLogger.structured({
      level: 'debug',
      context: BrowserlessPuppeteerAdapter.name,
      type: 'BROWSER',
      status: 'OK',
      message: 'Conectando a Browserless',
      meta: { browserWSEndpoint: wsBase },
    });

    try {
      return await puppeteer.connect({
        browserWSEndpoint,
        defaultViewport: { width: 1366, height: 768 },
      });
    } catch (connErr) {
      const error = connErr instanceof Error ? connErr : new Error(String(connErr));
      const { reason, userMessage } = this.browserlessHealth.classifyConnectionError(error);
      this.appLogger.structured({
        level: 'error',
        context: BrowserlessPuppeteerAdapter.name,
        type: 'BROWSERLESS_HEALTH',
        status: 'Error',
        message: `Browserless: fallo al establecer conexión WebSocket — ${userMessage}`,
        meta: { reason, originalError: error.message, wsBase },
      });
      throw new Error(`[BROWSERLESS_${reason}] ${userMessage}`);
    }
  }

  private async navigateAndAcceptModal(page: Page): Promise<void> {
    const url =
      this.configService.get<string>('DEMANDA_ENLINEA_URL') ??
      'https://procesojudicial.ramajudicial.gov.co/demandaenlinea';

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // A veces el portal muestra un modal de "Información Importante" (vacancia judicial)
    // antes de los términos. Si existe, hacemos click en "Continuar" y seguimos.
    await this.maybeHandleInfoImportantModal(page);

    await page.waitForSelector('#enableCheckbox', { timeout: 15000 });

    const checkbox = await page.$('#enableCheckbox');
    if (!checkbox) {
      throw new Error(
        'No se encontró el checkbox de aceptación de términos en el modal inicial (#enableCheckbox)',
      );
    }
    await checkbox.click();

    await page.waitForSelector('.jconfirm-buttons .btn.btn-violet', { timeout: 15000 });
    const continueButtons = await page.$$('.jconfirm-buttons .btn.btn-violet');
    if (!continueButtons || continueButtons.length === 0) {
      throw new Error('No se encontró el botón Continuar en el modal inicial');
    }
    await continueButtons[0].click();

    await delay(500);
    await page.waitForSelector('#DdlDepartamento', { timeout: 5000 });
    await page.waitForSelector('#DDlCiudad', { timeout: 5000 });
  }

  /**
   * Si aparece el modal "Información Importante" (vacancia judicial),
   * hace click en el botón "Continuar" y espera a que desaparezca.
   */
  private async maybeHandleInfoImportantModal(page: Page): Promise<void> {
    const clicked = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-box .jconfirm-title'));
      const infoTitle = titles.find((t) => /informaci[oó]n importante/i.test((t.textContent || '').trim()));
      if (!infoTitle) return false;

      const box = infoTitle.closest<HTMLElement>('.jconfirm-box');
      if (!box) return false;

      const buttons = Array.from(
        box.querySelectorAll<HTMLButtonElement>('.jconfirm-buttons .btn, .jconfirm-buttons button'),
      );
      const continuarBtn = buttons.find((b) => /continuar/i.test((b.textContent || '').trim()));
      if (!continuarBtn) return false;

      continuarBtn.click();
      return true;
    });

    if (!clicked) return;

    // Espera breve para que el modal se cierre.
    await page.waitForFunction(
      () => {
        const titles = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-box .jconfirm-title'));
        return !titles.some((t) => /informaci[oó]n importante/i.test((t.textContent || '').trim()));
      },
      { timeout: 10000, polling: 100 },
    );
  }

  /**
   * Tras ENVIAR: espera el div `jconfirm-open` con `span.jconfirm-title` «Confirmar Datos»
   * y botones Si/No en `.jconfirm-buttons`.
   *
   * En **Browserless** el portal suele mostrar **primero** un overlay con solo **CONTINUAR**
   * (título vacío); en navegador manual a veces no lo ves. Sin pulsar CONTINUAR no llega el
   * resumen «Confirmar Datos». Por eso, si detectamos solo CONTINUAR, hacemos clic y seguimos.
   */
  private async waitForJconfirmOpenConfirmarDatosAfterEnviar(
    page: Page,
    rowId: number,
    totalTimeoutMs: number,
  ): Promise<void> {
    const deadline = Date.now() + totalTimeoutMs;
    let continuarClicks = 0;
    const maxContinuar = 8;

    while (Date.now() < deadline) {
      const step = await page.evaluate(() => {
        // Solo verifica display/visibility — getBoundingClientRect puede devolver 0 en headless
        // antes de que el layout haga flush, causando falsos negativos.
        const notHidden = (el: HTMLElement) => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        };

        const roots = Array.from(
          document.querySelectorAll<HTMLElement>('.jconfirm-open'),
        ).filter(notHidden);
        roots.sort((a, b) => {
          const za = parseInt(window.getComputedStyle(a).zIndex || '0', 10) || 0;
          const zb = parseInt(window.getComputedStyle(b).zIndex || '0', 10) || 0;
          return zb - za;
        });

        for (const root of roots) {
          const titleSpan = root.querySelector<HTMLElement>('span.jconfirm-title');
          const titleText = (titleSpan?.textContent ?? '').trim();
          const wrap = root.querySelector<HTMLElement>('.jconfirm-buttons');
          const btns = wrap
            ? Array.from(wrap.querySelectorAll<HTMLButtonElement>('button, .btn'))
            : [];

          const hasSi = btns.some((b) => /^si$/i.test((b.innerText || b.textContent || '').trim()));
          const hasNo = btns.some((b) => /^no$/i.test((b.innerText || b.textContent || '').trim()));

          if (/confirmar\s+datos/i.test(titleText) && hasSi && hasNo) {
            return { action: 'found_confirmar' as const };
          }

          const contentText = (root.querySelector('.jconfirm-content')?.textContent ?? '').trim();
          /**
           * `ConfirmaDatos()` del portal usa `title: false` + icono `fa-spinner` en el título.
           * No es un paso intermedio hacia «Confirmar Datos»; es error de validación (p. ej. valArray vacío).
           */
          const hasSpinnerTitle =
            !!root.querySelector(
              '.jconfirm-title-c .fa-spinner, .jconfirm-title-c .fa-spin, .jconfirm-icon-c .fa-spinner',
            ) && !titleText;

          if (!(hasSi && hasNo) && wrap && btns.length > 0) {
            const continuarBtn = btns.find((b) =>
              /continuar/i.test((b.innerText || b.textContent || '').trim()),
            );
            if (continuarBtn) {
              const looksLikeValidationError =
                hasSpinnerTitle ||
                /adjuntar un documento|tipo archivo de demanda es obligatorio|debe seleccionar|debe digitar|correo no coincide|debe agregar un accionado/i.test(
                  contentText,
                );
              if (looksLikeValidationError) {
                return {
                  action: 'portal_validation_modal' as const,
                  preview: contentText.slice(0, 420),
                };
              }
              // NO hacemos click aquí — se usa Puppeteer click desde fuera para
              // disparar todos los eventos del mouse que jConfirm necesita.
              return { action: 'need_continuar' as const };
            }
          }
        }

        return { action: 'idle' as const };
      });

      if (step.action === 'found_confirmar') {
        return;
      }
      if (step.action === 'portal_validation_modal') {
        throw new Error(`JCONFIRM_PORTAL_VALIDACION: ${step.preview}`);
      }
      if (step.action === 'need_continuar') {
        continuarClicks += 1;
        if (continuarClicks > maxContinuar) {
          throw new Error('JCONFIRM_DEMASIADOS_PASOS_CONTINUAR');
        }
        await this.persistAutomationDetail(
          rowId,
          `Bot: el portal mostró CONTINUAR antes del resumen (típico en Browserless); clic ${continuarClicks} para mostrar «Confirmar Datos».`,
        );
        // Dispatch completo mousedown+mouseup+click para que jConfirm procese el evento
        await page.evaluate(() => {
          const roots = Array.from(
            document.querySelectorAll<HTMLElement>('.jconfirm-open'),
          );
          for (const root of roots) {
            const btns = Array.from(
              root.querySelectorAll<HTMLButtonElement>(
                '.jconfirm-buttons button, .jconfirm-buttons .btn',
              ),
            );
            const btn = btns.find((b) =>
              /continuar/i.test((b.innerText || b.textContent || '').trim()),
            );
            if (btn) {
              btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              return;
            }
          }
        });
        await delay(800);
        continue;
      }

      await delay(150);
    }

    throw new Error('JCONFIRM_OPEN_CONFIRMAR_DATOS_TIMEOUT');
  }

  private async fillLugarEnvio(
    page: Page,
    departamento: string,
    ciudad: string,
  ): Promise<void> {
    await page.waitForSelector('#DdlDepartamento', { timeout: 30000 });
    await page.waitForFunction(
      () => {
        const select = document.querySelector<HTMLSelectElement>('#DdlDepartamento');
        return !!select && select.options.length > 2;
      },
      { timeout: 20000 },
    );

    const departamentoResult = await page.evaluate((departamentoText: string) => {
      const select = document.querySelector<HTMLSelectElement>('#DdlDepartamento');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Departamento (DdlDepartamento)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const normalizedTarget = normalize(departamentoText);
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === normalizedTarget) ??
        items.find((i) => i.norm.startsWith(normalizedTarget)) ??
        items.find((i) => normalizedTarget.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(normalizedTarget));
      if (!candidate) {
        return { ok: false, error: `No se encontró el departamento "${departamentoText}" en el portal` };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }, departamento);

    if (!departamentoResult.ok) {
      throw new Error(departamentoResult.error ?? 'Error al seleccionar el Departamento');
    }

    await page.waitForFunction(
      () => {
        const select = document.querySelector<HTMLSelectElement>('#DDlCiudad');
        if (!select) return false;
        const options = Array.from(select.options);
        return options.some((o) => {
          const text = (o.textContent ?? '').trim().toUpperCase();
          return (
            o.value !== '' &&
            o.value !== '-1' &&
            text.length > 0 &&
            text !== 'SELECCIONE...'
          );
        });
      },
      { timeout: 20000 },
    );

    const ciudadResult = await page.evaluate((ciudadText: string) => {
      const select = document.querySelector<HTMLSelectElement>('#DDlCiudad');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Ciudad (DDlCiudad)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const normalizedTarget = normalize(ciudadText);
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === normalizedTarget) ??
        items.find((i) => i.norm.startsWith(normalizedTarget)) ??
        items.find((i) => normalizedTarget.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(normalizedTarget));
      if (!candidate) {
        return { ok: false, error: `No se encontró la ciudad "${ciudadText}" en el portal` };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }, ciudad);

    if (!ciudadResult.ok) {
      throw new Error(ciudadResult.error ?? 'Error al seleccionar la Ciudad');
    }

    // Dar tiempo a que aparezca el modal "Restricción de Horario" si la ciudad tiene restricción
    await delay(1500);

    // Modal: .jconfirm-holder > .jconfirm-content con "Restricción de Horario", botón .jconfirm-buttons .btn.btn-purple (SALIR)
    const horarioRestriction = await page.evaluate(() => {
      const holder = document.querySelector<HTMLElement>('.jconfirm-holder');
      if (!holder) return null;
      const content = holder.querySelector<HTMLElement>('.jconfirm-content');
      if (!content) return null;
      const rawText = content.innerText || content.textContent || '';
      if (!/restricci[oó]n de horario/i.test(rawText)) return null;
      const normalized = rawText.replace(/\s+/g, ' ').trim();
      const salirButton =
        holder.querySelector<HTMLButtonElement>('.jconfirm-buttons button.btn-purple') ??
        Array.from(holder.querySelectorAll<HTMLButtonElement>('.jconfirm-buttons button')).find(
          (b) => /salir/i.test((b.textContent ?? '').trim()),
        );
      if (salirButton) salirButton.click();
      return normalized;
    });

    if (horarioRestriction) {
      throw new Error(`HORARIO_NO_DISPONIBLE: ${horarioRestriction}`);
    }
  }

  private async fillEspecialidadYClase(
    page: Page,
    especialidades: string[],
    clasesProceso: string[],
  ): Promise<void> {
    await page.waitForSelector('#DDlEspecialidad', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const sel = document.querySelector<HTMLSelectElement>('#DDlEspecialidad');
        return !!sel && sel.options.length > 2;
      },
      { timeout: 20000 },
    );

    const especialidadList = Array.isArray(especialidades) ? especialidades : [especialidades];
    let especialidadOk = false;
    let lastEspecialidadError: string | undefined;

    for (const especialidadText of especialidadList) {
      const result = await page.evaluate((text: string) => {
        const select = document.querySelector<HTMLSelectElement>('#DDlEspecialidad');
        if (!select) {
          return { ok: false, error: 'No se encontró el select de Especialidad (DDlEspecialidad)' };
        }
        const normalize = (value: string) =>
          value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
        const normalizedTarget = normalize(text);
        const items = Array.from(select.options)
          .filter((o) => o.textContent && o.textContent.trim().length > 0)
          .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
        const candidate =
          items.find((i) => i.norm === normalizedTarget) ??
          items.find((i) => i.norm.startsWith(normalizedTarget)) ??
          items.find((i) => normalizedTarget.startsWith(i.norm)) ??
          items.find((i) => i.norm.includes(normalizedTarget));
        if (!candidate) {
          return { ok: false, error: `No se encontró la especialidad "${text}" en el portal` };
        }
        select.value = candidate.option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true };
      }, especialidadText);

      if (result.ok) {
        especialidadOk = true;
        break;
      }
      lastEspecialidadError = result.error ?? `No se pudo seleccionar la especialidad "${especialidadText}"`;
    }

    if (!especialidadOk) {
      throw new Error(
        lastEspecialidadError ??
          'No se pudo seleccionar ninguna de las especialidades configuradas en amountType',
      );
    }

    await page.waitForFunction(
      () => {
        const select = document.querySelector<HTMLSelectElement>('#DDlProceso');
        if (!select) return false;
        const options = Array.from(select.options);
        return options.some((o) => {
          const text = (o.textContent ?? '').trim().toUpperCase();
          return (
            o.value !== '' &&
            o.value !== '-1' &&
            text.length > 0 &&
            text !== 'SELECCIONE...'
          );
        });
      },
      { timeout: 20000 },
    );

    const clasesList = Array.isArray(clasesProceso) ? clasesProceso : [clasesProceso];
    let claseOk = false;
    let lastClaseError: string | undefined;

    for (const claseText of clasesList) {
      const result = await page.evaluate((text: string) => {
        const select = document.querySelector<HTMLSelectElement>('#DDlProceso');
        if (!select) {
          return { ok: false, error: 'No se encontró el select de Clase de Proceso (DDlProceso)' };
        }
        const normalize = (value: string) =>
          value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
        const normalizedTarget = normalize(text);
        const items = Array.from(select.options)
          .filter((o) => o.textContent && o.textContent.trim().length > 0)
          .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
        const candidate =
          items.find((i) => i.norm === normalizedTarget) ??
          items.find((i) => i.norm.startsWith(normalizedTarget)) ??
          items.find((i) => normalizedTarget.startsWith(i.norm)) ??
          items.find((i) => i.norm.includes(normalizedTarget));
        if (!candidate) {
          return { ok: false, error: `No se encontró la clase de proceso "${text}" en el portal` };
        }
        select.value = candidate.option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true };
      }, claseText);

      if (result.ok) {
        claseOk = true;
        break;
      }
      lastClaseError =
        result.error ?? `No se pudo seleccionar la clase de proceso "${claseText}" en el portal`;
    }

    if (!claseOk) {
      throw new Error(
        lastClaseError ??
          'No se pudo seleccionar ninguna de las clases de proceso configuradas en amountType',
      );
    }
  }

  private async fillSujetosProcesalesDemandanteJuridico(
    page: Page,
    rowId: number,
    demanda: ManagementDemandsOnline,
    demandante: {
      nit: string;
      company_name: string;
      address: string;
      contact_number: string;
      email_notifications: string;
    },
    demandado?: {
      document_type_name: string;
      identification: string;
      first_name: string;
      second_name: string;
      first_last_name: string;
      second_last_name: string;
      completed_name: string;
      address: string;
      phone: string;
    },
    apoderado?: {
      document_name: string;
      document_number: string;
      first_name: string;
      second_name: string;
      first_last_name: string;
      second_last_name: string;
      address: string;
      contact_number: string;
      email_notifications: string;
    },
    pdfServiceConfig?: { url: string; api_key: string },
  ): Promise<ProcesarLugarEnvioResult> {
    // Fase 1: configuración de Sujetos Procesales para el DEMANDANTE JURÍDICO
    await this.persistAutomationDetail(rowId, 'Bot: demandante — tipo sujeto y persona jurídica');
    await delay(500);

    const tipoSujetoResult = await page.evaluate(() => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const target = 'DEMANDANTE';
      const candidates: HTMLSelectElement[] = [];
      const direct = document.querySelector<HTMLSelectElement>('#DDlTipodeSujeto');
      if (direct) candidates.push(direct);
      const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label'));
      for (const label of labels) {
        const text = normalize(label.textContent ?? '');
        if (!text.includes('TIPO DE SUJETO')) continue;
        const container =
          label.closest('.form-row, .form-group, .row') ?? label.parentElement ?? document.body;
        const sel = container.querySelector<HTMLSelectElement>('select');
        if (sel && !candidates.includes(sel)) candidates.push(sel);
      }
      const select = candidates[0];
      if (!select) return { ok: true };
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.startsWith(target)) ??
        items.find((i) => target.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(target));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción Demandante en Tipo de sujeto' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });

    if (!tipoSujetoResult.ok) {
      throw new Error(tipoSujetoResult.error ?? 'Error al seleccionar Tipo de sujeto Demandante');
    }

    await page.waitForSelector('#DDlTipoPersona', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const sel = document.querySelector<HTMLSelectElement>('#DDlTipoPersona');
        return !!sel && sel.options.length > 2;
      },
      { timeout: 10000 },
    );

    // 2) Seleccionar Tipo de persona = JURÍDICA
    const tipoPersonaResult = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipoPersona');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Tipo de persona (DDlTipoPersona)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const target = 'JURIDICA';
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.startsWith(target)) ??
        items.find((i) => target.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(target));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción JURÍDICA en el select de Tipo de persona' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });

    if (!tipoPersonaResult.ok) {
      throw new Error(tipoPersonaResult.error ?? 'Error al seleccionar Tipo de persona JURÍDICA');
    }

    // Esperar a que el select Tipo de documento se cargue con opciones (p. ej. tras elegir JURÍDICA)
    await delay(1000);
    await page.waitForSelector('#DDlTipodocumento', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const select = document.querySelector<HTMLSelectElement>('#DDlTipodocumento');
        if (!select) return false;
        const normalize = (value: string) =>
          value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
        return Array.from(select.options).some(
          (o) => o.value && o.value !== '-1' && normalize(o.textContent ?? '').includes('NIT'),
        );
      },
      { timeout: 15000 },
    );

    // 3) Seleccionar Tipo de documento = NIT
    const tipoDocumentoResult = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipodocumento');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Tipo de documento (DDlTipodocumento)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const target = 'NIT';
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.startsWith(target)) ??
        items.find((i) => target.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(target));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción NIT en el select de Tipo de documento' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });

    if (!tipoDocumentoResult.ok) {
      throw new Error(tipoDocumentoResult.error ?? 'Error al seleccionar Tipo de documento NIT');
    }

    await this.persistAutomationDetail(rowId, 'Bot: demandante — NIT y datos de contacto');
    // 4) Diligenciar Número de documento con el NIT configurado
    const numeroDocumentoResult = await page.evaluate((nitValue: string) => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const findInputByLabelText = (labelText: string): HTMLInputElement | null => {
        const target = normalize(labelText);
        const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label'));
        for (const label of labels) {
          const text = normalize(label.textContent ?? '');
          if (!text.includes(target)) continue;
          if (label.htmlFor) {
            const el = document.getElementById(label.htmlFor);
            if (el && el.tagName === 'INPUT') return el as HTMLInputElement;
          }
          const container =
            label.closest('.form-row, .form-group, .row') ?? label.parentElement ?? document.body;
          const input = container?.querySelector<HTMLInputElement>('input.form-control, input') ?? null;
          if (input) return input;
        }
        return null;
      };
      const input = findInputByLabelText('Número Documento');
      if (!input) return { ok: false, error: 'No se encontró el campo Número Documento' };
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = nitValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Retirar el foco explícitamente para que el portal procese el cambio
      input.blur();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }, demandante.nit);

    if (!numeroDocumentoResult.ok) {
      throw new Error(
        numeroDocumentoResult.error ?? 'Error al diligenciar el campo Número Documento',
      );
    }

    // Dar tiempo al portal para que termine de cargar/normalizar los datos asociados al NIT
    await delay(1500);

    await page.evaluate(
      (data: { company_name: string; address: string; contact_number: string }) => {
        const normalize = (value: string) =>
          value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
        const findInputByLabelText = (labelText: string): HTMLInputElement | null => {
          const target = normalize(labelText);
          const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label'));
          for (const label of labels) {
            const text = normalize(label.textContent ?? '');
            if (!text.includes(target)) continue;
            if (label.htmlFor) {
              const el = document.getElementById(label.htmlFor);
              if (el && el.tagName === 'INPUT') return el as HTMLInputElement;
            }
            const container =
              label.closest('.form-row, .form-group, .row') ?? label.parentElement ?? document.body;
            const input = container?.querySelector<HTMLInputElement>('input.form-control, input') ?? null;
            if (input) return input;
          }
          return null;
        };
        const razonInput = findInputByLabelText('Razón Social');
        if (razonInput && data.company_name) {
          razonInput.value = data.company_name;
          razonInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        const dirInput = document.querySelector<HTMLInputElement>('#IdDireccion');
        if (dirInput && data.address) {
          dirInput.value = data.address;
          dirInput.dispatchEvent(new Event('input', { bubbles: true }));
          dirInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const telInput = document.querySelector<HTMLInputElement>('#IdTelefono');
        if (telInput && data.contact_number) {
          telInput.value = data.contact_number;
          telInput.dispatchEvent(new Event('input', { bubbles: true }));
          telInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      {
        company_name: demandante.company_name,
        address: demandante.address,
        contact_number: demandante.contact_number,
      },
    );

    await this.persistAutomationDetail(rowId, 'Bot: demandante — correo y validación');
    await this.ejecutarCorreoValidarContinuar(page, demandante.email_notifications);

    await page.waitForSelector('#btnAddAccionado', { timeout: 15000 });
    await this.persistAutomationDetail(rowId, 'Bot: demandante — agregar a la grilla');
    const agregarBtn = await page.$('#btnAddAccionado');
    if (!agregarBtn) {
      throw new Error('No se encontró el botón "Agregar" para Sujetos Procesales');
    }
    await agregarBtn.click();

    // Dar tiempo a que el sujeto procesal Demandante quede agregado en la grilla
    await delay(1000);

    // Si no hay datos del demandado configurados, dejamos el flujo hasta aquí.
    if (!demandado || !demandado.identification) {
      this.appLogger.structured({
        level: 'debug',
        context: BrowserlessPuppeteerAdapter.name,
        type: 'BROWSER',
        status: 'WARN',
        message:
          'Datos de demandado no proporcionados en input.demandado; el flujo se detiene luego de agregar Demandante',
      });
      await this.persistAutomationDetail(rowId, 'Bot: fin demandante (sin demandado en datos)');
      return { reachedArchivosAdjuntos: false, pdfDemandaAdjuntado: false };
    }

    // Fase 2: DEMANDADO NATURAL
    await this.persistAutomationDetail(rowId, 'Bot: demandado — tipo sujeto y persona natural');
    // 1) Seleccionar Tipo de sujeto = DEMANDADO en #DDlTipoSujeto
    await page.waitForSelector('#DDlTipoSujeto', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const sel = document.querySelector<HTMLSelectElement>('#DDlTipoSujeto');
        return !!sel && sel.options.length > 2;
      },
      { timeout: 10000 },
    );

    const tipoSujetoDemandadoResult = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipoSujeto');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Tipo de sujeto (DDlTipoSujeto)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const target = 'DEMANDADO';
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.startsWith(target)) ??
        items.find((i) => target.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(target));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción DEMANDADO en Tipo de sujeto (DDlTipoSujeto)' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });

    if (!tipoSujetoDemandadoResult.ok) {
      throw new Error(
        tipoSujetoDemandadoResult.error ??
          'Error al seleccionar Tipo de sujeto DEMANDADO en la fase de Demandado',
      );
    }

    // 2) Seleccionar Tipo de persona = NATURAL en #DDlTipoPersona
    await page.waitForSelector('#DDlTipoPersona', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const sel = document.querySelector<HTMLSelectElement>('#DDlTipoPersona');
        return !!sel && sel.options.length > 2;
      },
      { timeout: 10000 },
    );

    const tipoPersonaNaturalResult = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipoPersona');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Tipo de persona (DDlTipoPersona)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const target = 'NATURAL';
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.startsWith(target)) ??
        items.find((i) => target.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(target));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción NATURAL en el select de Tipo de persona' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });

    if (!tipoPersonaNaturalResult.ok) {
      throw new Error(
        tipoPersonaNaturalResult.error ??
          'Error al seleccionar Tipo de persona NATURAL para el Demandado',
      );
    }

    // 3) Seleccionar Tipo de documento del demandado en #DDlTipodocumento
    await delay(1000);
    await page.waitForSelector('#DDlTipodocumento', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const select = document.querySelector<HTMLSelectElement>('#DDlTipodocumento');
        if (!select) return false;
        return Array.from(select.options).some(
          (o) => o.value && o.value !== '-1' && (o.textContent ?? '').trim().length > 0,
        );
      },
      { timeout: 15000 },
    );

    const tipoDocumentoDemandadoResult = await page.evaluate((rawDocType: string) => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipodocumento');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Tipo de documento (DDlTipodocumento)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const source = normalize(rawDocType);

      let target: string | null = null;
      if (source.includes('CIUDADANIA')) {
        target = 'CEDULA DE CIUDADANIA';
      } else if (source.includes('EXTRANJERIA')) {
        target = 'CEDULA DE EXTRANJERIA';
      } else if (source.includes('PASAPORTE') || source === 'PA') {
        target = 'PASAPORTE';
      }

      const options = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));

      let candidate;
      if (target) {
        const targetNorm = normalize(target);
        candidate =
          options.find((i) => i.norm === targetNorm) ??
          options.find((i) => i.norm.startsWith(targetNorm)) ??
          options.find((i) => targetNorm.startsWith(i.norm)) ??
          options.find((i) => i.norm.includes(targetNorm));
      } else {
        // Fallback: buscar por el texto original normalizado
        candidate =
          options.find((i) => i.norm === source) ??
          options.find((i) => i.norm.startsWith(source)) ??
          options.find((i) => source.startsWith(i.norm)) ??
          options.find((i) => i.norm.includes(source));
      }

      if (!candidate) {
        return {
          ok: false,
          error: `No se encontró la opción de Tipo de documento para el demandado a partir de "${rawDocType}"`,
        };
      }

      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }, demandado.document_type_name ?? '');

    if (!tipoDocumentoDemandadoResult.ok) {
      throw new Error(
        tipoDocumentoDemandadoResult.error ??
          'Error al seleccionar Tipo de documento para el Demandado',
      );
    }

    await this.persistAutomationDetail(rowId, 'Bot: demandado — documento y nombres');
    // 4) Diligenciar Número de documento del Demandado
    const numeroDocumentoDemandadoResult = await page.evaluate((idValue: string) => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const findInputByLabelText = (labelText: string): HTMLInputElement | null => {
        const target = normalize(labelText);
        const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label'));
        for (const label of labels) {
          const text = normalize(label.textContent ?? '');
          if (!text.includes(target)) continue;
          if (label.htmlFor) {
            const el = document.getElementById(label.htmlFor);
            if (el && el.tagName === 'INPUT') return el as HTMLInputElement;
          }
          const container =
            label.closest('.form-row, .form-group, .row') ?? label.parentElement ?? document.body;
          const input = container?.querySelector<HTMLInputElement>('input.form-control, input') ?? null;
          if (input) return input;
        }
        return null;
      };
      const input = findInputByLabelText('Número Documento');
      if (!input) return { ok: false, error: 'No se encontró el campo Número Documento para el Demandado' };
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = idValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.blur();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }, demandado.identification ?? '');

    if (!numeroDocumentoDemandadoResult.ok) {
      throw new Error(
        numeroDocumentoDemandadoResult.error ??
          'Error al diligenciar el campo Número Documento del Demandado',
      );
    }

    // Dar tiempo al portal para que termine de cargar/normalizar los datos asociados al documento
    await delay(1500);

    // 5) Diligenciar nombres y apellidos usando clients.* (sin split de completed_name)
    await page.evaluate(
      (payload: {
        first_name: string;
        second_name: string;
        first_last_name: string;
        second_last_name: string;
      }) => {
      const normalizeBase = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();

      const normalizeLabel = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();

      const findInputByLabelText = (labelText: string): HTMLInputElement | null => {
        const target = normalizeLabel(labelText);
        const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label'));
        for (const label of labels) {
          const text = normalizeLabel(label.textContent ?? '');
          if (!text.includes(target)) continue;
          if (label.htmlFor) {
            const el = document.getElementById(label.htmlFor);
            if (el && el.tagName === 'INPUT') return el as HTMLInputElement;
          }
          const container =
            label.closest('.form-row, .form-group, .row') ?? label.parentElement ?? document.body;
          const input = container?.querySelector<HTMLInputElement>('input.form-control, input') ?? null;
          if (input) return input;
        }
        return null;
      };

      const firstName = normalizeBase(payload.first_name ?? '');
      const secondName = normalizeBase(payload.second_name ?? '');
      const firstLastName = normalizeBase(payload.first_last_name ?? '');
      const secondLastName = normalizeBase(payload.second_last_name ?? '');

      const applyValue = (label: string, value: string) => {
        const input = findInputByLabelText(label);
        if (!input) return;
        input.focus();
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        if (value) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        input.blur();
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      applyValue('Primer Nombre', firstName);
      applyValue('Segundo Nombre', secondName);
      applyValue('Primer Apellido', firstLastName);
      applyValue('Segundo Apellido', secondLastName);
      },
      {
        first_name: demandado.first_name ?? '',
        second_name: demandado.second_name ?? '',
        first_last_name: demandado.first_last_name ?? '',
        second_last_name: demandado.second_last_name ?? '',
      },
    );

    // 6) Tipo de discapacidad = No Aplica
    await this.persistAutomationDetail(rowId, 'Bot: demandado — discapacidad y localidad');
    await page.waitForSelector('#DDlTipodiscapacidad', { timeout: 15000 });
    const tipoDiscapacidadResult = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipodiscapacidad');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Tipo de discapacidad (DDlTipodiscapacidad)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const target = 'NO APLICA';
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.startsWith(target)) ??
        items.find((i) => target.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(target));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción NO APLICA en Tipo de discapacidad' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });

    if (!tipoDiscapacidadResult.ok) {
      throw new Error(
        tipoDiscapacidadResult.error ??
          'Error al seleccionar Tipo de discapacidad = No Aplica para el Demandado',
      );
    }

    // 7) Localidad: solo aplica si el portal muestra el select #DDlLocalidad.
    // - Si el select NO existe → la ciudad no requiere localidad, el flujo continúa normalmente.
    // - Si el select SÍ existe → debe tener "00 - DESCONOCIDA / DUDOSA" o "Sin Localidad".
    //   Si ninguna está presente → Novedad (el servicio lo captura y detiene el flujo).
    const localidadSelectPresente = await page
      .waitForSelector('#DDlLocalidad', { timeout: 8000 })
      .then(() => true)
      .catch(() => false);

    if (!localidadSelectPresente) {
      this.appLogger.structured({
        level: 'log',
        context: BrowserlessPuppeteerAdapter.name,
        type: 'AUTOMATION',
        status: 'Info',
        message: 'Bot: select de Localidad no presente en el portal para esta ciudad — paso omitido, flujo continúa',
        meta: { demandaId: rowId },
      });
    } else {
      // Esperar a que el select se pueble
      await page
        .waitForFunction(
          () => {
            const s = document.querySelector<HTMLSelectElement>('#DDlLocalidad');
            return !s || Array.from(s.options).length > 1;
          },
          { timeout: 8000 },
        )
        .catch(() => {/* si no se puebla, evaluamos con lo que haya */});

      const localidadResult = await page.evaluate(() => {
        const select = document.querySelector<HTMLSelectElement>('#DDlLocalidad');
        if (!select) {
          return { ok: true, skipped: true };
        }
        const normalize = (v: string) =>
          v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
        const items = Array.from(select.options)
          .filter((o) => o.textContent?.trim())
          .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));

        const candidate =
          items.find((i) => i.option.value === '1476') ??
          items.find((i) => i.norm.startsWith('00 - DESCONOCIDA')) ??
          items.find((i) => i.norm.includes('DESCONOCIDA / DUDOSA')) ??
          items.find((i) => i.option.value === '0') ??
          items.find((i) => i.norm === 'SIN LOCALIDAD');

        if (!candidate) {
          return { ok: false, skipped: false };
        }

        select.value = candidate.option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, skipped: false, selected: candidate.option.textContent?.trim() };
      });

      if (!localidadResult.ok) {
        throw new Error(
          `LOCALIDAD_PREDETERMINADA_NO_ENCONTRADA: El select de Localidad existe pero no contiene ninguna de las opciones requeridas ("00 - DESCONOCIDA / DUDOSA" o "Sin Localidad").`,
        );
      }
    }

    await this.persistAutomationDetail(rowId, 'Bot: demandado — dirección, teléfono y agregar');
    // 8) Dirección del Demandado (IdDireccion) en mayúsculas
    await page.evaluate((direccion: string) => {
      const input = document.querySelector<HTMLInputElement>('#IdDireccion');
      if (!input) return;
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (direccion) {
        input.value = direccion;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      input.blur();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, demandado.address ?? '');

    // 9) Teléfono del Demandado (IdTelefono)
    await page.evaluate((telefono: string) => {
      const input = document.querySelector<HTMLInputElement>('#IdTelefono');
      if (!input) return;
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (telefono) {
        input.value = telefono;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      input.blur();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, demandado.phone ?? '');

    // Dar tiempo similar al del Demandante antes de agregar el Demandado
    await delay(1000);

    const agregarDemandadoBtn = await page.$('#btnAddAccionado');
    if (!agregarDemandadoBtn) {
      throw new Error('No se encontró el botón "Agregar" para agregar el Demandado');
    }
    await agregarDemandadoBtn.click();

    // Dar tiempo a que el Demandado quede agregado en la grilla
    await delay(1000);

    // Fase 3: preparar el formulario para el APODERADO NATURAL y dejar el flujo detenido allí
    await this.persistAutomationDetail(rowId, 'Bot: apoderado — tipo sujeto y persona natural');
    await page.waitForSelector('#DDlTipoSujeto', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const sel = document.querySelector<HTMLSelectElement>('#DDlTipoSujeto');
        return !!sel && sel.options.length > 2;
      },
      { timeout: 10000 },
    );

    const tipoSujetoApoderadoResult = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipoSujeto');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Tipo de sujeto (DDlTipoSujeto)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const target = 'APODERADO';
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.startsWith(target)) ??
        items.find((i) => target.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(target));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción APODERADO en Tipo de sujeto (DDlTipoSujeto)' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });

    if (!tipoSujetoApoderadoResult.ok) {
      throw new Error(
        tipoSujetoApoderadoResult.error ??
          'Error al seleccionar Tipo de sujeto APODERADO en la fase de Apoderado',
      );
    }

    await page.waitForSelector('#DDlTipoPersona', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const sel = document.querySelector<HTMLSelectElement>('#DDlTipoPersona');
        return !!sel && sel.options.length > 2;
      },
      { timeout: 10000 },
    );

    const tipoPersonaApoderadoNaturalResult = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipoPersona');
      if (!select) {
        return { ok: false, error: 'No se encontró el select de Tipo de persona (DDlTipoPersona)' };
      }
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const target = 'NATURAL';
      const items = Array.from(select.options)
        .filter((o) => o.textContent && o.textContent.trim().length > 0)
        .map((o) => ({ option: o, norm: normalize(o.textContent as string) }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.startsWith(target)) ??
        items.find((i) => target.startsWith(i.norm)) ??
        items.find((i) => i.norm.includes(target));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción NATURAL en el select de Tipo de persona' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });

    if (!tipoPersonaApoderadoNaturalResult.ok) {
      throw new Error(
        tipoPersonaApoderadoNaturalResult.error ??
          'Error al seleccionar Tipo de persona NATURAL para el Apoderado',
      );
    }

    if (!apoderado || !apoderado.document_number || !apoderado.email_notifications) {
      throw new Error(
        'Fase apoderado: falta lawyer_data para portfolio_type_id (document_number y email_notifications obligatorios)',
      );
    }

    await this.persistAutomationDetail(rowId, 'Bot: apoderado — tipo documento y número');
    await delay(800);
    await page.waitForSelector('#DDlTipodocumento', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const sel = document.querySelector<HTMLSelectElement>('#DDlTipodocumento');
        return !!sel && sel.options.length > 2;
      },
      { timeout: 15000 },
    );

    const tipoDocApoderado = await page.evaluate((documentName: string) => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipodocumento');
      if (!select) return { ok: false, error: 'No se encontró #DDlTipodocumento (apoderado)' };
      const normalize = (v: string) =>
        v
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase();
      const source = normalize(documentName);
      const items = Array.from(select.options)
        .filter((o) => o.value && o.value !== '-1' && (o.textContent ?? '').trim())
        .map((o) => ({ option: o, norm: normalize(o.textContent ?? '') }));
      const candidate =
        items.find((i) => i.norm === source) ??
        items.find((i) => i.norm.includes(source)) ??
        items.find((i) => source.includes(i.norm));
      if (!candidate) {
        return { ok: false, error: `No se encontró tipo documento apoderado para "${documentName}"` };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }, apoderado.document_name);

    if (!tipoDocApoderado.ok) {
      throw new Error(tipoDocApoderado.error ?? 'Tipo documento apoderado');
    }

    const docClean = this.digitsOnly(apoderado.document_number);
    await page.evaluate((num: string) => {
      const input = document.querySelector<HTMLInputElement>('#DocumentodeIdendificacion');
      if (!input) return;
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = num;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.blur();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, docClean);
    await delay(1500);
    await page.evaluate(
      (payload: {
        first_name: string;
        second_name: string;
        first_last_name: string;
        second_last_name: string;
      }) => {
        const set = (id: string, val: string) => {
          const el = document.querySelector<HTMLInputElement>(id);
          if (!el) return;
          el.focus();
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.blur();
        };
        set('#PrimerNombre', payload.first_name);
        set('#SegundoNombre', payload.second_name);
        set('#PrimerApellido', payload.first_last_name);
        set('#SegundoApellido', payload.second_last_name);
      },
      {
        first_name: apoderado.first_name,
        second_name: apoderado.second_name ?? '',
        first_last_name: apoderado.first_last_name,
        second_last_name: apoderado.second_last_name ?? '',
      },
    );

    await this.persistAutomationDetail(rowId, 'Bot: apoderado — discapacidad, dirección y teléfono');
    const discApoderado = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipodiscapacidad');
      if (!select) return { ok: false, error: 'No se encontró #DDlTipodiscapacidad (apoderado)' };
      const normalize = (v: string) =>
        v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
      const items = Array.from(select.options)
        .filter((o) => o.value && o.value !== '-1')
        .map((o) => ({ option: o, norm: normalize(o.textContent ?? '') }));
      const c =
        items.find((i) => i.norm.includes('NO APLICA')) ??
        items.find((i) => i.norm === 'NO APLICA');
      if (!c) return { ok: false, error: 'No Aplica en discapacidad apoderado' };
      select.value = c.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });
    if (!discApoderado.ok) throw new Error(discApoderado.error ?? 'Discapacidad apoderado');

    const telClean = this.digitsOnly(apoderado.contact_number);
    await page.evaluate(
      (payload: { address: string; phone: string }) => {
        const dir = document.querySelector<HTMLInputElement>('#IdDireccion');
        if (dir) {
          dir.value = payload.address;
          dir.dispatchEvent(new Event('input', { bubbles: true }));
          dir.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const tel = document.querySelector<HTMLInputElement>('#IdTelefono');
        if (tel) {
          tel.value = payload.phone;
          tel.dispatchEvent(new Event('input', { bubbles: true }));
          tel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      { address: this.normalizeUpper(apoderado.address), phone: telClean },
    );

    await this.persistAutomationDetail(rowId, 'Bot: apoderado — correo, validar, continuar (igual que demandante)');
    await this.ejecutarCorreoValidarContinuar(page, apoderado.email_notifications);

    await this.persistAutomationDetail(rowId, 'Bot: apoderado — agregar a la grilla');
    await page.waitForSelector('#btnAddAccionado', { timeout: 15000 });
    const btnAddAp = await page.$('#btnAddAccionado');
    if (!btnAddAp) throw new Error('No se encontró #btnAddAccionado (apoderado)');
    await btnAddAp.click();
    await delay(2000);

    // Archivos adjuntos: bajar a la sección (a veces queda fuera de viewport hasta hacer scroll).
    await this.persistAutomationDetail(rowId, 'Bot: archivos adjuntos — acercando sección y seleccionando la opción DEMANDA');
    await page.evaluate(() => {
      const el =
        document.querySelector('#DDlTipoArchivo') ??
        document.querySelector('[id*="TipoArchivo" i]') ??
        Array.from(document.querySelectorAll('h4, h5, legend, .panel-title')).find((n) =>
          /archivos?\s+adjuntos?/i.test((n.textContent ?? '').trim()),
        );
      (el as HTMLElement | null)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    });
    await delay(1500);
    await page.waitForSelector('#DDlTipoArchivo', { timeout: 25000 });
    await page.waitForFunction(
      () => {
        const sel = document.querySelector<HTMLSelectElement>('#DDlTipoArchivo');
        return !!sel && sel.options.length > 2;
      },
      { timeout: 15000 },
    );
    const tipoArchivoResult = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#DDlTipoArchivo');
      if (!select) {
        return { ok: false, error: 'No se encontró #DDlTipoArchivo' };
      }
      const normalize = (v: string) =>
        v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
      const target = 'DEMANDA';
      const items = Array.from(select.options)
        .filter((o) => o.value && o.value !== '-1' && (o.textContent ?? '').trim())
        .map((o) => ({ option: o, norm: normalize(o.textContent ?? '') }));
      const candidate =
        items.find((i) => i.norm === target) ??
        items.find((i) => i.norm.includes(target)) ??
        items.find((i) => target.includes(i.norm));
      if (!candidate) {
        return { ok: false, error: 'No se encontró la opción DEMANDA en #DDlTipoArchivo' };
      }
      select.value = candidate.option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    });
    if (!tipoArchivoResult.ok) {
      throw new Error(tipoArchivoResult.error ?? 'Error al seleccionar tipo archivo DEMANDA');
    }
    await delay(800);

    /**
     * Carpeta temporal por gestión: {management_demands_online.id}-{portfolio_type_id}-{client_id}
     * (ej. 1-1-149). Misma demanda siempre misma carpeta; si ya existe, se vacía y se guarda solo
     * el PDF descargado con el mismo nombre que en S3 (basename de path_law_doc). Tras adjuntar,
     * se elimina la carpeta completa.
     */
    const tmpDir = path.join(
      this.tmpBaseDir,
      `${rowId}-${demanda.portfolio_type_id}-${demanda.client_id}`,
    );
    let pdfPath: string | null = null;
    // Banderas para construir mensajes finales coherentes (DB detail final vive en DemandsOnlineAutomationService).
    let captchaResolved = false;
    let enviarClicked = false;
    let confirmarDatosModalOpened = false;
    let confirmarDatosNoClicked = false;
    let confirmarDatosSiClicked = false;
    let confirmarDatosAction: 'SI' | 'NO' | undefined = undefined;
    let pdfAttached = false;
    // Tras ENVIAR: esperamos div.jconfirm-open con «Confirmar Datos» (si falla el catch usa failureStage).
    let awaitingJconfirmConfirmarDatos = false;
    let confirmarDatosModalDebug:
      | {
          visibleRoots: number;
          perRoot: Array<{ titlePreview: string; buttons: string[] }>;
        }
      | undefined;
    try {
      await this.persistAutomationDetail(
        rowId,
        'Bot: archivos adjuntos — generando PDF demanda (client_id / campaign_id)',
      );
      let pathDemandaPdf: string;
      try {
        pathDemandaPdf = await this.demandPdfPort.generateDemandOnlinePdf(
          demanda.client_id,
          demanda.campaign_id,
          pdfServiceConfig?.url ?? '',
          pdfServiceConfig?.api_key ?? '',
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await this.persistAutomationDetail(
          rowId,
          `Bot: error generando PDF DEMANDA (GENERATE_PDF_DEMAND_SERVICE): ${msg.slice(0, 280)}`,
        );
        this.appLogger.structured({
          level: 'warn',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'Fallo generación de PDF DEMANDA',
          meta: { rowId, error: msg },
        });
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: false,
          demandaRegistrada: false,
          captchaResolved: false,
          enviarClicked: false,
          confirmarDatosModalOpened: false,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked: false,
          confirmarDatosAction: undefined,
          failureStage: 'pdf_generate',
        };
      }

      const record = await this.managementDemandsOnlineRepository.findById(rowId);
      record.path_law_doc = pathDemandaPdf;
      await this.managementDemandsOnlineRepository.update(record);

      await this.persistAutomationDetail(rowId, 'Bot: archivos adjuntos — descargando PDF (temporal)');
      fs.mkdirSync(tmpDir, { recursive: true });
      /** Mismo nombre que el archivo en S3 (último segmento de path_law_doc). */
      const fileName =
        path.basename(pathDemandaPdf.trim().replace(/\\/g, '/')) || `demanda-${rowId}.pdf`;
      if (fs.existsSync(tmpDir)) {
        for (const name of fs.readdirSync(tmpDir)) {
          try {
            fs.unlinkSync(path.join(tmpDir, name));
          } catch {
            /* ignore */
          }
        }
      }
      pdfPath = path.join(tmpDir, fileName);
      try {
        await this.demandPdfPort.downloadDemandPdfToFile(pathDemandaPdf, pdfPath);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await this.persistAutomationDetail(
          rowId,
          `Bot: error descargando PDF DEMANDA (DOWNLOAD_PDF_DEMAND_SERVICE): ${msg.slice(0, 280)}`,
        );
        this.appLogger.structured({
          level: 'warn',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'Fallo descarga de PDF DEMANDA',
          meta: { rowId, error: msg },
        });
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: false,
          demandaRegistrada: false,
          captchaResolved: false,
          enviarClicked: false,
          confirmarDatosModalOpened: false,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked: false,
          confirmarDatosAction: undefined,
          failureStage: 'pdf_download',
        };
      }

      // Validación defensiva: si el servicio de descarga falla "a medias", Puppeteer
      // puede lanzar errores poco claros al intentar leer/subir el archivo.
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF no existe tras descarga: ${pdfPath}`);
      }
      const pdfStat = fs.statSync(pdfPath);
      if (!pdfStat || pdfStat.size < 64) {
        throw new Error(`PDF tamaño inválido tras descarga: ${pdfPath} (${pdfStat?.size ?? 'unknown'} bytes)`);
      }

      await this.persistAutomationDetail(rowId, 'Bot: archivos adjuntos — subiendo PDF al portal');
      await page.evaluate(() => {
        document.querySelector<HTMLElement>('#DDlTipoArchivo')?.scrollIntoView({
          block: 'center',
          behavior: 'instant',
        });
      });
      await delay(500);
      /**
       * El portal solo registra el archivo en `valArray` / grilla si el PDF va al input que espera
       * `agregarArchivo` (p. ej. `#ArchivoFile0` dentro de `.insertFile`). Elegir el último
       * `input[type=file]` de la página falla si hay más de uno (reCAPTCHA u otros).
       */
      const fileInput = await page.$('.insertFile input[type=file]');
      if (!fileInput) {
        throw new Error(
          'No se encontró .insertFile input[type=file] para adjuntar la demanda (esperado #ArchivoFile0).',
        );
      }
      /**
       * uploadFile() envía solo el path local al browser remoto (Browserless),
       * que no puede acceder al filesystem del servidor → archivo corrupto en el portal.
       * Solución: leer el PDF localmente, codificarlo en base64 y construir el File
       * directamente en el DOM del browser remoto vía page.evaluate.
       */
      const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
      const pdfFileName = path.basename(pdfPath);
      await page.evaluate(
        ({ base64Data, fileName }: { base64Data: string; fileName: string }) => {
          const input = document.querySelector<HTMLInputElement>('.insertFile input[type=file]');
          if (!input) throw new Error('input[type=file] no encontrado en .insertFile');
          const bytes = atob(base64Data);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          const blob = new Blob([arr], { type: 'application/pdf' });
          const file = new File([blob], fileName, { type: 'application/pdf' });
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        },
        { base64Data: pdfBase64, fileName: pdfFileName },
      );
      await delay(2000);

      await this.persistAutomationDetail(
        rowId,
        'Bot: archivos adjuntos — PDF demanda adjuntado; clic en Agregar Archivo.',
      );

      const addFileBtn = await page.$('#btnAddfile');
      if (!addFileBtn) {
        throw new Error('No se encontró el botón Agregar Archivo (#btnAddfile) después de adjuntar el PDF');
      }
      await addFileBtn.evaluate((el) => {
        (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'instant' });
      });
      await delay(500);
      await addFileBtn.click();
      pdfAttached = true;
      try {
        await page.waitForFunction(
          () => document.querySelectorAll('#tblFiles tbody tr').length > 0,
          { timeout: 25000 },
        );
      } catch {
        const spn = await page.evaluate(
          () => (document.querySelector('#spnmsg')?.textContent ?? '').trim(),
        );
        throw new Error(
          `ADJUNTO_DEMANDA_NO_EN_GRILLA: el portal no agregó fila en #tblFiles tras Agregar Archivo. spnmsg=${spn.slice(0, 240)}`,
        );
      }
      await delay(1500);

      await this.solveRecaptcha(page, rowId);
      captchaResolved = true;

      await this.persistAutomationDetail(
        rowId,
        'Bot: reCAPTCHA resuelto; siguiente paso: espera 1s y clic en ENVIAR (#enviar).',
      );

      const enviarAfterRecaptchaDelayMs =
        Number(this.configService.get<string>('ENVIAR_AFTER_RECAPTCHA_DELAY_MS') ?? '1000') ||
        1000;
      const confirmarDatosPostEnviarDelayMs =
        Number(this.configService.get<string>('CONFIRMAR_DATOS_POST_ENVIAR_DELAY_MS') ?? '1000') ||
        1000;

      const enviarBtn = await page.$('#enviar');
      if (!enviarBtn) {
        throw new Error('No se encontró el botón ENVIAR (#enviar) después del reCAPTCHA');
      }
      this.appLogger.structured({
        level: 'debug',
        context: BrowserlessPuppeteerAdapter.name,
        type: 'BROWSER',
        status: 'OK',
        message: `Botón ENVIAR encontrado; se hará click en ${enviarAfterRecaptchaDelayMs}ms`,
      });
      await enviarBtn.evaluate((el) => {
        (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'instant' });
      });
      await delay(enviarAfterRecaptchaDelayMs);
      await enviarBtn.click();
      enviarClicked = true;

      await this.persistAutomationDetail(rowId, 'Bot: ENVIAR clicado.');
      const confirmarDatosModalWaitMs =
        Number(this.configService.get<string>('CONFIRMAR_DATOS_MODAL_WAIT_MS') ?? '15000') || 15000;
      awaitingJconfirmConfirmarDatos = true;
      await delay(confirmarDatosPostEnviarDelayMs);

      await this.waitForJconfirmOpenConfirmarDatosAfterEnviar(page, rowId, confirmarDatosModalWaitMs);
      confirmarDatosModalOpened = true;
      awaitingJconfirmConfirmarDatos = false;

      const jconfirmSnapshot = await page.evaluate(() => {
        const notHidden = (el: HTMLElement) => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        };
        const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(notHidden);
        for (const root of roots) {
          const titleSpan = root.querySelector<HTMLElement>('span.jconfirm-title');
          const titleText = (titleSpan?.textContent ?? '').trim();
          if (!/confirmar\s+datos/i.test(titleText)) continue;
          const wrap = root.querySelector<HTMLElement>('.jconfirm-buttons');
          const btns = wrap
            ? Array.from(wrap.querySelectorAll<HTMLButtonElement>('button, .btn'))
            : [];
          const labels = btns.map((b) => (b.innerText || b.textContent || '').trim());
          return {
            ok: true as const,
            titleText,
            buttonLabels: labels,
          };
        }
        return { ok: false as const };
      });

      if (!jconfirmSnapshot.ok) {
        throw new Error('JCONFIRM_OPEN_CONFIRMAR_DATOS: snapshot inconsistente tras wait');
      }

      await this.persistAutomationDetail(
        rowId,
        'Bot: div.jconfirm-open visible (overlay jConfirm — Confirmar Datos).',
      );
      await this.persistAutomationDetail(
        rowId,
        `Bot: span.jconfirm-title encontrado — "${jconfirmSnapshot.titleText.slice(0, 120)}".`,
      );
      await this.persistAutomationDetail(
        rowId,
        `Bot: botones encontrados en .jconfirm-buttons — [${jconfirmSnapshot.buttonLabels.join(' | ')}].`,
      );

      /** Volcado del HTML del overlay a consola (Node) para depurar selectores. Ver .env.example. */
      const logJconfirmHtml =
        this.configService.get<string>('LOG_JCONFIRM_OPEN_HTML_CONSOLE') === 'true' ||
        this.configService.get<string>('LOG_JCONFIRM_OPEN_HTML_CONSOLE') === '1';
      if (logJconfirmHtml) {
        const maxChars =
          Number(this.configService.get<string>('LOG_JCONFIRM_OPEN_HTML_MAX_CHARS') ?? '200000') ||
          200000;
        const { rootOuterHTML, bytes } = await page.evaluate(() => {
          const notHidden = (el: HTMLElement) => {
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
          };
          const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(notHidden);
          roots.sort((a, b) => {
            const za = parseInt(window.getComputedStyle(a).zIndex || '0', 10) || 0;
            const zb = parseInt(window.getComputedStyle(b).zIndex || '0', 10) || 0;
            return zb - za;
          });
          for (const root of roots) {
            const titleSpan = root.querySelector<HTMLElement>('span.jconfirm-title');
            const titleText = (titleSpan?.textContent ?? '').trim();
            if (!/confirmar\s+datos/i.test(titleText)) continue;
            const html = root.outerHTML;
            return { rootOuterHTML: html, bytes: html.length };
          }
          return { rootOuterHTML: '', bytes: 0 };
        });
        let toPrint = rootOuterHTML;
        let truncated = false;
        if (toPrint.length > maxChars) {
          toPrint = `${toPrint.slice(0, maxChars)}\n<!-- … TRUNCADO: ${bytes} bytes totales, límite LOG_JCONFIRM_OPEN_HTML_MAX_CHARS=${maxChars} -->`;
          truncated = true;
        }
        // eslint-disable-next-line no-console -- salida explícita pedida para inspección de DOM
        console.log(
          `\n========== [BOT demanda en línea] HTML div.jconfirm-open (antes de clic No) id=${rowId} bytes=${bytes}${
            truncated ? ' TRUNCADO' : ''
          } ==========`,
        );
        // eslint-disable-next-line no-console
        console.log(toPrint);
        // eslint-disable-next-line no-console
        console.log('========== FIN HTML jconfirm-open ==========\n');
        this.appLogger.structured({
          level: 'debug',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'OK',
          message: 'HTML div.jconfirm-open volcado a consola (LOG_JCONFIRM_OPEN_HTML_CONSOLE)',
          meta: { rowId, bytes, truncated, maxChars },
        });
      }

      // DEMANDS_PENDING_SYNC_SIMULATED_PORTAL=true  → MODO 1 (simulación): clic en "No", no registra en portal.
      // DEMANDS_PENDING_SYNC_SIMULATED_PORTAL=false → MODO 2 (producción): clic en "Si", obtiene radicado.
      const isSimulated = this.configService.get<string>('DEMANDS_PENDING_SYNC_SIMULATED_PORTAL') !== 'false';

      if (isSimulated) {
        /**
         * MODO 1 (simulación) — DEMANDS_PENDING_SYNC_SIMULATED_PORTAL=true:
         *   Clic en "No". No se registra la demanda en el portal.
         */
        const clicNo = await page.evaluate(() => {
          const notHidden = (el: HTMLElement) => {
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
          };
          const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(notHidden);
          for (const root of roots) {
            const titleSpan = root.querySelector<HTMLElement>('span.jconfirm-title');
            const titleText = (titleSpan?.textContent ?? '').trim();
            if (!/confirmar\s+datos/i.test(titleText)) continue;
            const wrap = root.querySelector<HTMLElement>('.jconfirm-buttons');
            if (!wrap) continue;
            const btns = Array.from(wrap.querySelectorAll<HTMLButtonElement>('button, .btn'));
            const noBtn = btns.find((b) => /^no$/i.test((b.innerText || b.textContent || '').trim()));
            if (!noBtn) continue;
            noBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            noBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            noBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return true;
          }
          return false;
        });

        if (!clicNo) {
          await this.persistAutomationDetail(
            rowId,
            'Bot: div.jconfirm-open con «Confirmar Datos» visible, pero no se encontró el botón No en .jconfirm-buttons.',
          );
          throw new Error('NO_SE_ENCONTRO_BOTON_NO_EN_JCONFIRM_CONFIRMAR_DATOS');
        }

        await delay(500);

        // Esperamos a que el div jconfirm-open deje de mostrar «Confirmar Datos» (cierre del overlay).
        try {
          await page.waitForFunction(
            () => {
              const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open'));
              return !roots.some((root) => {
                const span = root.querySelector<HTMLElement>('span.jconfirm-title');
                return span && /confirmar\s+datos/i.test((span.textContent || '').trim());
              });
            },
            { timeout: 3000, polling: 100 },
          );
        } catch {
          // ignore (el overlay a veces tarda en cerrarse)
        }

        await this.persistAutomationDetail(
          rowId,
          'Bot: clic en NO ejecutado (simulación).',
        );

        confirmarDatosNoClicked = true;
        confirmarDatosAction = 'NO';
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: true,
          demandaRegistrada: true,
          captchaResolved,
          enviarClicked,
          confirmarDatosModalOpened,
          confirmarDatosNoClicked,
          confirmarDatosSiClicked,
          confirmarDatosAction,
        };
      }

      /**
       * MODO 2 (producción) — DEMANDS_PENDING_SYNC_SIMULATED_PORTAL=false:
       *   Clic en "Si", espera del modal de radicado y clic en "Finalizar".
       */

      // CLIC REAL EN "SI" — busca el modal «Confirmar Datos» activo y dispara click en el botón Si.
      const clicSi = await page.evaluate(() => {
        const notHidden = (el: HTMLElement) => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        };
        const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(notHidden);
        for (const root of roots) {
          const titleSpan = root.querySelector<HTMLElement>('span.jconfirm-title');
          const titleText = (titleSpan?.textContent ?? '').trim();
          if (!/confirmar\s+datos/i.test(titleText)) continue;
          const wrap = root.querySelector<HTMLElement>('.jconfirm-buttons');
          if (!wrap) continue;
          const btns = Array.from(wrap.querySelectorAll<HTMLButtonElement>('button, .btn'));
          const siBtn = btns.find((b) => /^si$/i.test((b.innerText || b.textContent || '').trim()));
          if (!siBtn) continue;
          siBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          siBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          siBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      });

      if (!clicSi) {
        await this.persistAutomationDetail(
          rowId,
          'Bot: div.jconfirm-open con «Confirmar Datos» visible, pero no se encontró el botón Si en .jconfirm-buttons.',
        );
        throw new Error('NO_SE_ENCONTRO_BOTON_SI_EN_MODAL_CONFIRMAR_DATOS');
      }

      confirmarDatosSiClicked = true;
      confirmarDatosAction = 'SI';
      confirmarDatosNoClicked = false;

      await this.persistAutomationDetail(
        rowId,
        'Bot: clic en SI (Confirmar Datos) ejecutado. Esperando modal de doble confirmación...',
      );

      // Espera el modal de doble confirmación («¿Está seguro que desea continuar?») — 1.5 s es suficiente.
      await delay(1500);
      const dobleConfirmacionFound = await page.evaluate(() => {
        const notHidden = (el: HTMLElement) => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        };
        const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(notHidden);
        for (const root of roots) {
          const wrap = root.querySelector<HTMLElement>('.jconfirm-buttons');
          if (!wrap) continue;
          const btns = Array.from(wrap.querySelectorAll<HTMLButtonElement>('button, .btn'));
          const tieneBotonSi = btns.some((b) => /^si$/i.test((b.innerText || b.textContent || '').trim()));
          const tieneBotonNo = btns.some((b) => /^no$/i.test((b.innerText || b.textContent || '').trim()));
          if (tieneBotonSi && tieneBotonNo) return true;
        }
        return false;
      });

      if (!dobleConfirmacionFound) {
        await this.persistAutomationDetail(
          rowId,
          'Bot: tras clic en SI (Confirmar Datos) no apareció el modal de doble confirmación.',
        );
        throw new Error('DOBLE_CONFIRMACION_MODAL_NO_APARECIO_TRAS_CLIC_SI');
      }

      await this.persistAutomationDetail(
        rowId,
        'Bot: modal de doble confirmación detectado. Dando clic en Si...',
      );

      // CLIC EN "SI" del modal de doble confirmación.
      const clicSiDobleConfirmacion = await page.evaluate(() => {
        const notHidden = (el: HTMLElement) => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        };
        const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(notHidden);
        for (const root of roots) {
          const wrap = root.querySelector<HTMLElement>('.jconfirm-buttons');
          if (!wrap) continue;
          const btns = Array.from(wrap.querySelectorAll<HTMLButtonElement>('button, .btn'));
          const siBtn = btns.find((b) => /^si$/i.test((b.innerText || b.textContent || '').trim()));
          const noBtn = btns.find((b) => /^no$/i.test((b.innerText || b.textContent || '').trim()));
          if (!siBtn || !noBtn) continue;
          siBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          siBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          siBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      });

      if (!clicSiDobleConfirmacion) {
        await this.persistAutomationDetail(
          rowId,
          'Bot: modal de doble confirmación visible pero no se encontró el botón Si en .jconfirm-buttons.',
        );
        throw new Error('NO_SE_ENCONTRO_BOTON_SI_EN_MODAL_DOBLE_CONFIRMACION');
      }

      await this.persistAutomationDetail(
        rowId,
        'Bot: clic en SI (doble confirmación) ejecutado. Esperando modal de número de radicado...',
      );

      // Espera el modal con botón «Finalizar» — polling cada 1 s, máximo 10 intentos.
      let finalizarModalFound = false;
      let numberFiled: string | undefined;

      for (let i = 0; i < 10; i++) {
        await delay(1000);
        const finalizarCheck = await page.evaluate(() => {
          const notHidden = (el: HTMLElement) => {
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
          };
          const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(notHidden);
          for (const root of roots) {
            const wrap = root.querySelector<HTMLElement>('.jconfirm-buttons');
            if (!wrap) continue;
            const btns = Array.from(wrap.querySelectorAll<HTMLButtonElement>('button, .btn'));
            const finalizarBtn = btns.find(
              (b) => /^finalizar$/i.test((b.innerText || b.textContent || '').trim()),
            );
            if (!finalizarBtn) continue;
            const contentDiv = root.querySelector<HTMLElement>('.jconfirm-content');
            const contentText = contentDiv?.textContent ?? '';
            const match = contentText.match(/(\d{5,})/);
            return { found: true, number: match ? match[1] : undefined };
          }
          return { found: false, number: undefined };
        });

        if (finalizarCheck.found) {
          finalizarModalFound = true;
          numberFiled = finalizarCheck.number;
          break;
        }
      }

      if (!finalizarModalFound) {
        await this.persistAutomationDetail(
          rowId,
          'Bot: tras clic en SI no apareció el modal con botón Finalizar en 10 segundos.',
        );
        throw new Error('FINALIZAR_MODAL_NO_APARECIO_TRAS_CLIC_SI');
      }

      await this.persistAutomationDetail(
        rowId,
        `Bot: modal Finalizar detectado. Número radicado: ${numberFiled ?? 'no detectado'}. Dando clic en Finalizar...`,
      );

      // CLIC EN "FINALIZAR"
      const clicFinalizar = await page.evaluate(() => {
        const notHidden = (el: HTMLElement) => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        };
        const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(notHidden);
        for (const root of roots) {
          const wrap = root.querySelector<HTMLElement>('.jconfirm-buttons');
          if (!wrap) continue;
          const btns = Array.from(wrap.querySelectorAll<HTMLButtonElement>('button, .btn'));
          const finalizarBtn = btns.find(
            (b) => /^finalizar$/i.test((b.innerText || b.textContent || '').trim()),
          );
          if (!finalizarBtn) continue;
          finalizarBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          finalizarBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          finalizarBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      });

      if (!clicFinalizar) {
        await this.persistAutomationDetail(
          rowId,
          'Bot: modal Finalizar visible pero no se encontró el botón Finalizar en .jconfirm-buttons.',
        );
        throw new Error('NO_SE_ENCONTRO_BOTON_FINALIZAR_EN_MODAL_RADICADO');
      }

      await this.persistAutomationDetail(
        rowId,
        `Bot: clic en Finalizar ejecutado. Número radicado: ${numberFiled ?? '-'}. Flujo completado.`,
      );

      return {
        reachedArchivosAdjuntos: true,
        pdfDemandaAdjuntado: true,
        demandaRegistrada: true,
        captchaResolved,
        enviarClicked,
        confirmarDatosModalOpened,
        confirmarDatosNoClicked,
        confirmarDatosSiClicked,
        confirmarDatosAction,
        numberFiled,
      };


    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const lower = msg.toLowerCase();
      const isRecaptchaError =
        lower.includes('recaptcha_no_resuelto') || lower.includes('browserless_solve_captcha');

      if (isRecaptchaError) {
        await this.persistAutomationDetail(
          rowId,
          `Bot: reCAPTCHA — no se pudo resolver automáticamente: ${msg.slice(0, 200)}`,
        );
        this.appLogger.structured({
          level: 'warn',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'Fallo al resolver reCAPTCHA en demandaenlinea',
          meta: { rowId, error: msg },
        });
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: true,
          demandaRegistrada: false,
          captchaResolved: false,
          enviarClicked: false,
          confirmarDatosModalOpened: false,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked: false,
          confirmarDatosAction: undefined,
          failureStage: 'recaptcha',
        };
      }

      if (msg.includes('ADJUNTO_DEMANDA_NO_EN_GRILLA')) {
        await this.persistAutomationDetail(
          rowId,
          `Bot: ${msg.slice(0, 420)}`,
        );
        this.appLogger.structured({
          level: 'warn',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'PDF no quedó en grilla del portal (#tblFiles)',
          meta: { rowId },
        });
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: true,
          demandaRegistrada: false,
          captchaResolved,
          enviarClicked: false,
          confirmarDatosModalOpened: false,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked: false,
          confirmarDatosAction: undefined,
          failureStage: 'portal_adjunto_no_en_grilla',
        };
      }

      // Tras ENVIAR: el portal abrió jConfirm de validación (ConfirmaDatos), no «Confirmar Datos».
      if (awaitingJconfirmConfirmarDatos && msg.includes('JCONFIRM_PORTAL_VALIDACION')) {
        const detalle = msg.replace(/^JCONFIRM_PORTAL_VALIDACION:\s*/i, '').trim();
        await this.persistAutomationDetail(
          rowId,
          `Bot: ENVIAR rechazado por validación del portal (no es «Confirmar Datos»): ${detalle.slice(0, 420)}`,
        );
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: true,
          demandaRegistrada: false,
          captchaResolved,
          enviarClicked,
          confirmarDatosModalOpened: false,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked: false,
          confirmarDatosAction: undefined,
          failureStage: 'portal_enviar_validation_error',
        };
      }

      // Tras ENVIAR: no apareció a tiempo div.jconfirm-open con «Confirmar Datos» + Si/No (PDF OK).
      if (awaitingJconfirmConfirmarDatos) {
        const confirmarDatosModalWaitMs =
          Number(this.configService.get<string>('CONFIRMAR_DATOS_MODAL_WAIT_MS') ?? '15000') || 15000;
        const confirmarDatosModalWaitSeconds = Math.round(confirmarDatosModalWaitMs / 1000);
        try {
          confirmarDatosModalDebug = await page.evaluate(() => {
            const visible = (el: HTMLElement) => {
              const s = window.getComputedStyle(el);
              const r = el.getBoundingClientRect();
              return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
            };
            const roots = Array.from(document.querySelectorAll<HTMLElement>('.jconfirm-open')).filter(visible);
            const perRoot = roots.slice(0, 4).map((root) => {
              const titlePreview = (root.querySelector('span.jconfirm-title')?.textContent ?? '')
                .trim()
                .slice(0, 80);
              const buttons = Array.from(
                root.querySelectorAll<HTMLButtonElement>('.jconfirm-buttons button, .jconfirm-buttons .btn'),
              ).map((btn) => (btn.innerText || btn.textContent || '').trim());
              return { titlePreview, buttons: buttons.slice(0, 8) };
            });
            return {
              visibleRoots: roots.length,
              perRoot,
            };
          });
        } catch {
          confirmarDatosModalDebug = undefined;
        }
        const debugSuffix = confirmarDatosModalDebug
          ? ` | debug_jconfirm: roots=${confirmarDatosModalDebug.visibleRoots}, detalle=${JSON.stringify(
              confirmarDatosModalDebug.perRoot,
            ).slice(0, 360)}`
          : '';
        const demasiadosContinuar = lower.includes('jconfirm_demasiados_pasos_continuar');
        await this.persistAutomationDetail(
          rowId,
          `Bot: tras ENVIAR, no apareció a tiempo «Confirmar Datos»+Si/No (máx. ${confirmarDatosModalWaitSeconds}s).${demasiadosContinuar ? ' Demasiados pasos CONTINUAR.' : ''}${debugSuffix}`.slice(
            0,
            480,
          ),
        );
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: true,
          demandaRegistrada: false,
          captchaResolved,
          enviarClicked,
          confirmarDatosModalOpened: false,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked: false,
          confirmarDatosAction: undefined,
          failureStage: 'jconfirm_confirmar_datos_timeout',
        };
      }

      // Fallo al hacer clic en Si del modal «Confirmar Datos» (producción).
      if (msg.includes('NO_SE_ENCONTRO_BOTON_SI_EN_MODAL_CONFIRMAR_DATOS')) {
        this.appLogger.structured({
          level: 'warn',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'No se encontró botón Si en modal Confirmar Datos',
          meta: { rowId },
        });
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: true,
          demandaRegistrada: false,
          captchaResolved,
          enviarClicked,
          confirmarDatosModalOpened,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked: false,
          confirmarDatosAction: undefined,
          failureStage: 'confirmar_datos_si',
        };
      }

      // Fallo en el modal de doble confirmación («¿Está seguro?»).
      if (
        msg.includes('DOBLE_CONFIRMACION_MODAL_NO_APARECIO_TRAS_CLIC_SI') ||
        msg.includes('NO_SE_ENCONTRO_BOTON_SI_EN_MODAL_DOBLE_CONFIRMACION')
      ) {
        this.appLogger.structured({
          level: 'warn',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'Fallo en modal de doble confirmación',
          meta: { rowId, error: msg },
        });
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: true,
          demandaRegistrada: false,
          captchaResolved,
          enviarClicked,
          confirmarDatosModalOpened,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked,
          confirmarDatosAction,
          failureStage: 'doble_confirmacion',
        };
      }

      // Fallo en el modal Finalizar (timeout o botón no encontrado).
      if (
        msg.includes('FINALIZAR_MODAL_NO_APARECIO_TRAS_CLIC_SI') ||
        msg.includes('NO_SE_ENCONTRO_BOTON_FINALIZAR_EN_MODAL_RADICADO')
      ) {
        this.appLogger.structured({
          level: 'warn',
          context: BrowserlessPuppeteerAdapter.name,
          type: 'BROWSER',
          status: 'WARN',
          message: 'Fallo en modal Finalizar (radicado)',
          meta: { rowId, error: msg },
        });
        return {
          reachedArchivosAdjuntos: true,
          pdfDemandaAdjuntado: true,
          demandaRegistrada: false,
          captchaResolved,
          enviarClicked,
          confirmarDatosModalOpened,
          confirmarDatosNoClicked: false,
          confirmarDatosSiClicked,
          confirmarDatosAction,
          failureStage: 'finalizar',
        };
      }

      await this.persistAutomationDetail(
        rowId,
        `Bot: archivos adjuntos — error PDF/adjunto: ${msg.slice(0, 280)}`,
      );
      this.appLogger.structured({
        level: 'warn',
        context: BrowserlessPuppeteerAdapter.name,
        type: 'BROWSER',
        status: 'WARN',
        message: 'Fallo generación/descarga/adjunto PDF demanda',
        meta: { rowId, error: msg, stack: e instanceof Error ? e.stack : undefined },
      });
      await this.persistAutomationDetail(
        rowId,
        'Bot: archivos adjuntos — tipo DEMANDA OK; adjunte PDF manualmente o revise servicios GENERATE/DOWNLOAD.',
      );
      return {
        reachedArchivosAdjuntos: true,
        pdfDemandaAdjuntado: pdfAttached,
        demandaRegistrada: false,
        captchaResolved,
        enviarClicked,
        confirmarDatosModalOpened: false,
        confirmarDatosNoClicked: false,
        confirmarDatosSiClicked: false,
        confirmarDatosAction: undefined,
        failureStage: pdfAttached ? 'unknown' : 'pdf_attach',
      };
    } finally {
      if (fs.existsSync(tmpDir)) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
    }
  }

  private async solveRecaptcha(page: Page, rowId: number): Promise<void> {
    await this.persistAutomationDetail(
      rowId,
      'Bot: reCAPTCHA — resolviendo automáticamente con Browserless (auto + solveCaptcha).',
    );

    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.g-recaptcha')?.scrollIntoView({
        block: 'center',
        behavior: 'instant',
      });
    });
    await delay(1500);

    const cdp = await page.createCDPSession();

    type CaptchaAutoSolvedPayload = {
      token?: string;
      found?: boolean;
      solved?: boolean;
      time?: number;
      error?: string;
    };

    // Tu plan Prototyping permite hasta 15 min por sesión.
    // Ajustamos los timeouts para no cortar el solve antes de tiempo.
    const captchaWaitMs = 14 * 60 * 1000; // margen frente al max de la sesión

    // Espera por evidencia real de "resuelto" en el DOM (token).
    const tokenPromise = page
      .waitForFunction(
        () => {
          const textarea = document.querySelector<HTMLTextAreaElement>('#g-recaptcha-response');
          return !!textarea && !!textarea.value && textarea.value.trim().length > 0;
        },
        { timeout: captchaWaitMs },
      )
      .then(
        () => true,
        () => false,
      );

    let autoSolvedTimeout: NodeJS.Timeout | null = null;
    let autoCleanup: (() => void) | undefined;

    const autoSolvedPromise: Promise<CaptchaAutoSolvedPayload | null> = new Promise((resolve) => {
      autoSolvedTimeout = setTimeout(() => resolve(null), captchaWaitMs);

      const onAutoSolved = (params: CaptchaAutoSolvedPayload) => {
        autoSolvedTimeout && clearTimeout(autoSolvedTimeout);
        if (autoCleanup) autoCleanup();
        resolve(params);
      };

      const onCaptchaFound = (params: CaptchaAutoSolvedPayload) => {
        // Informativo (evitamos persistir mucho para no saturar)
        // eslint-disable-next-line no-console
        if (params?.found !== undefined) {
          this.appLogger.structured({
            level: 'debug',
            context: BrowserlessPuppeteerAdapter.name,
            type: 'BROWSER',
            status: 'OK',
            message: 'captchaFound',
            meta: { rowId, found: params.found },
          });
        }
      };

      (cdp as any).on('Browserless.captchaAutoSolved', onAutoSolved);
      (cdp as any).on('Browserless.captchaFound', onCaptchaFound);

      autoCleanup = () => {
        if (autoSolvedTimeout) clearTimeout(autoSolvedTimeout);
        (cdp as any).off?.('Browserless.captchaAutoSolved', onAutoSolved);
        (cdp as any).off?.('Browserless.captchaFound', onCaptchaFound);
      };
    });

    // solveCaptchas=true en la URL ya resuelve el captcha automáticamente.
    // El comando explícito Browserless.solveCaptcha bloqueaba ~22s y luego
    // lanzaba "Target closed", matando la página. Se elimina — los listeners
    // captchaAutoSolved + tokenPromise son suficientes.

    const race = await Promise.race([
      tokenPromise.then((ok) => ({ kind: 'token' as const, ok })),
      autoSolvedPromise.then((res) => ({ kind: 'auto' as const, res })),
    ]);

    // Si el token ya está, consideramos éxito aunque no tengamos el evento.
    if (race.kind === 'token') {
      if (!race.ok) {
        throw new Error(
          `RECAPTCHA_NO_RESUELTO: el token (#g-recaptcha-response) no apareció en el tiempo esperado (${Math.round(
            captchaWaitMs / 1000,
          )}s).`,
        );
      }
      await this.persistAutomationDetail(rowId, 'Bot: reCAPTCHA — token generado; continuando flujo.');
      if (autoCleanup) autoCleanup();
      try {
        await page.evaluate(() => true);
      } catch {
        throw new Error('RECAPTCHA_PAGE_DETACHED: la página fue cerrada tras la resolución del reCAPTCHA.');
      }
      return;
    }

    // Caso: llegó el evento.
    const result = race.res;
    if (autoCleanup) autoCleanup();

    if (!result) {
      throw new Error(
        `RECAPTCHA_NO_RESUELTO: Browserless no completó el desafío en el tiempo esperado (${Math.round(
          captchaWaitMs / 1000,
        )}s).`,
      );
    }

    if (result.error) {
      throw new Error(
        `BROWSERLESS_SOLVE_CAPTCHA_ERROR: ${result.error} (found=${String(
          result.found,
        )}, solved=${String(result.solved)})`,
      );
    }

    if (!result.solved) {
      // Aun así, verificamos token por si el evento vino "optimista".
      const tokenOk = await page
        .waitForFunction(
          () => {
            const textarea = document.querySelector<HTMLTextAreaElement>('#g-recaptcha-response');
            return !!textarea && !!textarea.value && textarea.value.trim().length > 0;
          },
          { timeout: 15000 },
        )
        .then(
          () => true,
          () => false,
        );

      if (!tokenOk) {
        throw new Error(
          `RECAPTCHA_NO_RESUELTO: Browserless.captchaAutoSolved devolvió solved=false (found=${String(
            result.found,
          )}).`,
        );
      }
    }

    // Token final (rápido) para garantizar que el portal acepte la solución.
    const tokenOk = await page
      .waitForFunction(
        () => {
          const textarea = document.querySelector<HTMLTextAreaElement>('#g-recaptcha-response');
          return !!textarea && !!textarea.value && textarea.value.trim().length > 0;
        },
        { timeout: 15000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (!tokenOk) {
      throw new Error('RECAPTCHA_NO_RESUELTO: Browserless no generó el token en el DOM.');
    }

    try {
      await page.evaluate(() => true);
    } catch {
      throw new Error('RECAPTCHA_PAGE_DETACHED: la página fue cerrada tras la resolución del reCAPTCHA.');
    }
  }
}
