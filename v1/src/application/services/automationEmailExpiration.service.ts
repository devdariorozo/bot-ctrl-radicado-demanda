// Responsabilidad: eliminar diariamente los registros de tbl_automation_email cuyo
// autm_created_at supere el umbral de días configurado en AUTOMATION_EMAIL_EXPIRATION_DAYS.
// La ejecución ocurre una vez al día a la hora definida en AUTOMATION_EMAIL_EXPIRATION_HOURS
// (formato HH:MM). Al arrancar calcula los ms hasta la próxima ejecución y programa un
// setTimeout que se encadena a sí mismo tras cada ciclo.

import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AUTOMATION_EMAIL_REPOSITORY,
  AutomationEmailRepository,
} from '@domain/ports/automationEmail.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

@Injectable()
export class AutomationEmailExpirationService implements OnModuleInit, OnModuleDestroy {
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(
    @Inject(AUTOMATION_EMAIL_REPOSITORY)
    private readonly automationEmailRepository: AutomationEmailRepository,
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  onModuleInit(): void {
    const ms = this.msUntilNextRun();
    const hhmm = this.getExpirationHours();
    const days = this.getExpirationDays();

    this.appLogger.structured({
      level: 'log',
      context: AutomationEmailExpirationService.name,
      type: 'EMAIL_EXPIRATION',
      status: 'OK',
      message: `Scheduler de expiración programado. Primera ejecución en ${this.formatMs(ms)}.`,
      meta: { expirationDays: days, scheduledTime: hhmm, msUntilRun: ms },
    });

    this.scheduleNextRun(ms);
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  // ─── Ciclo principal ───────────────────────────────────────────────────────

  private scheduleNextRun(ms: number): void {
    this.timeoutHandle = setTimeout(() => {
      void this.runExpiration().finally(() => {
        if (!this.destroyed) {
          // Siguiente ejecución en exactamente 24h (ya pasó la hora del día)
          this.scheduleNextRun(this.msUntilNextRun());
        }
      });
    }, ms);
  }

  async runExpiration(): Promise<void> {
    const days = this.getExpirationDays();

    this.appLogger.structured({
      level: 'log',
      context: AutomationEmailExpirationService.name,
      type: 'EMAIL_EXPIRATION',
      status: 'OK',
      message: `Iniciando purga de registros de correo con más de ${days} días.`,
      meta: { expirationDays: days },
    });

    try {
      const deleted = await this.automationEmailRepository.deleteOlderThan(days);

      this.appLogger.structured({
        level: 'log',
        context: AutomationEmailExpirationService.name,
        type: 'EMAIL_EXPIRATION',
        status: 'OK',
        message: `Purga completada: ${deleted} registro(s) eliminado(s).`,
        meta: { expirationDays: days, deleted },
      });
    } catch (err) {
      this.appLogger.structured({
        level: 'error',
        context: AutomationEmailExpirationService.name,
        type: 'EMAIL_EXPIRATION',
        status: 'Error',
        message: 'Error al ejecutar la purga de registros de correo.',
        meta: { expirationDays: days, error: (err as Error).message },
        stack: (err as Error).stack,
      });
    }
  }

  // ─── Cálculo de tiempo hasta la próxima ejecución ─────────────────────────

  private msUntilNextRun(): number {
    const [hours, minutes] = this.parseHHMM(this.getExpirationHours());
    const now = new Date();
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    // Si la hora ya pasó hoy, programar para mañana
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next.getTime() - now.getTime();
  }

  // ─── Config ────────────────────────────────────────────────────────────────

  private getExpirationDays(): number {
    const v = this.configService.get<number>('AUTOMATION_EMAIL_EXPIRATION_DAYS', 30);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
  }

  private getExpirationHours(): string {
    const raw = this.configService.get<string>('AUTOMATION_EMAIL_EXPIRATION_HOURS', '04:00');
    return /^\d{2}:\d{2}$/.test(raw.trim()) ? raw.trim() : '04:00';
  }

  private parseHHMM(hhmm: string): [number, number] {
    const [h, m] = hhmm.split(':').map(Number);
    const hours = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 4;
    const mins  = Number.isFinite(m) && m >= 0 && m <= 59 ? m : 0;
    return [hours, mins];
  }

  private formatMs(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${m}m ${s}s`;
  }
}
