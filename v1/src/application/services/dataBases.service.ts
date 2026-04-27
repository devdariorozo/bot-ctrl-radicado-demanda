// Responsabilidad: fachada de aplicación que usará el controller.

import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BasesConfig, DataBases } from '@domain/entities/dataBases.entities';
import { CreateDataBasesInput, DataBasesRepository, DATABASES_REPOSITORY } from '@domain/ports/dataBases.ports';
import { TBL_ENVIRONMENT_TYPE_REPOSITORY, TblEnvironmentTypeRepository } from '@domain/ports/environmentType.ports';
import { TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/portfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/stateType.ports';
import { TblEnvironmentTypeId } from '@domain/value-objects/environmentType.valueobjects';
import { TblPortfolioTypeId } from '@domain/value-objects/portfolioType.valueobjects';
import { TblStateTypeId } from '@domain/value-objects/stateType.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { jsonStableStringify } from '@application/utils/jsonStableStringify.utils';

function buildLabelDataBase(portfolioTypeName: string, environmentTypeName: string): string {
  return `${portfolioTypeName} - ${environmentTypeName}`.trim();
}

/** Excluir opciones cuyo entorno sea "producción" (heurística: pro, prod, production, producción). */
export function isProductionEnvironmentName(envType: string): boolean {
  const t = (envType || '').trim().toLowerCase();
  if (!t) return false;
  if (t === 'pro') return true;
  if (t === 'producción' || t === 'produccion') return true;
  if (t.includes('prod')) return true;
  if (t.includes('production') || t.includes('producción') || t.includes('produccion')) return true;
  return false;
}

/** Nombre corto mostrable para `db_bases` en selects: primera clave del JSON, si existe. */
export function shortLabelForBases(bases: BasesConfig, detail: string): string {
  if (bases && typeof bases === 'object') {
    const k = Object.keys(bases);
    if (k.length) return k[0];
  }
  return (detail || '').trim() || 'config';
}

@Injectable()
export class DataBasesService {
  constructor(
    @Inject(DATABASES_REPOSITORY)
    private readonly dataBasesRepository: DataBasesRepository,
    @Inject(TBL_ENVIRONMENT_TYPE_REPOSITORY)
    private readonly environmentTypeRepository: TblEnvironmentTypeRepository,
    @Inject(TBL_PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: TblPortfolioTypeRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
  ) {}

  async create(input: CreateDataBasesInput): Promise<DataBases> {
    try {
      TblEnvironmentTypeId.create(input.db_environment_type_id);
      TblPortfolioTypeId.create(input.db_portfolio_type_id);
      TblStateTypeId.create(input.db_state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.fkEnterosPositivos);
    }

    try {
      await this.environmentTypeRepository.findById(input.db_environment_type_id);
      await this.portfolioTypeRepository.findById(input.db_portfolio_type_id);
      await this.stateTypeRepository.findById(input.db_state_type_id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado' });
    }

    if (!input.db_bases || typeof input.db_bases !== 'object' || Object.keys(input.db_bases).length === 0) {
      throw new UnprocessableEntityException(userMsg.alMenosUnaBase);
    }

    const duplicate = await this.dataBasesRepository.findByEnvAndPortfolio(
      input.db_environment_type_id,
      input.db_portfolio_type_id,
    );
    if (duplicate) {
      throw new ConflictException({
        message: 'El registro ya existe',
        db_environment_type_id: input.db_environment_type_id,
        db_portfolio_type_id: input.db_portfolio_type_id,
        db_id: duplicate.db_id,
      });
    }

    const normalizedInput = { ...input, db_detail: capitalizeFirstWord(input.db_detail) };
    try {
      return await this.dataBasesRepository.create(normalizedInput);
    } catch {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(): Promise<DataBases[]> {
    try {
      const [dbs, envTypes, portfolioTypes, stateTypes] = await Promise.all([
        this.dataBasesRepository.findAll(),
        this.environmentTypeRepository.findAll(),
        this.portfolioTypeRepository.findAll(),
        this.stateTypeRepository.findAll(),
      ]);
      const envMap = new Map(envTypes.map((e) => [e.env_id, e]));
      const portfolioMap = new Map(portfolioTypes.map((p) => [p.porty_id, p]));
      const stateMap = new Map(stateTypes.map((s) => [s.stty_id, s]));
      return dbs.map((db) => {
        const env = envMap.get(db.db_environment_type_id);
        const portfolio = portfolioMap.get(db.db_portfolio_type_id);
        const state = stateMap.get(db.db_state_type_id);
        const envType = env?.env_type ?? '';
        const portfolioType = portfolio?.porty_type ?? '';
        const stateType = state?.stty_type ?? '';
        const pStateName = portfolio
          ? stateMap.get(portfolio.porty_state_type_id)?.stty_type ?? ''
          : '';
        return {
          db_id: db.db_id,
          db_environment_type_id: db.db_environment_type_id,
          environment_type_name: envType,
          db_portfolio_type_id: db.db_portfolio_type_id,
          portfolio_type_name: portfolioType,
          label_data_base: buildLabelDataBase(portfolioType, envType),
          db_bases: db.db_bases,
          db_detail: db.db_detail,
          db_state_type_id: db.db_state_type_id,
          state_type_name: stateType,
          portfolio_state_type_name: pStateName,
          db_created_at: db.db_created_at,
          db_updated_at: db.db_updated_at,
          db_responsible: db.db_responsible,
        };
      });
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  /** `opciones`: excluir filas cuyo entorno asociado se considere producción. */
  findOptionsExcludingProduction(enriched: DataBases[]): DataBases[] {
    return enriched.filter((r) => !isProductionEnvironmentName(r.environment_type_name ?? ''));
  }

  /** `opcionesActivas`: estado de la fila (data_bases) activo, no inactivo en stty_type. */
  findOptionsActiveState(enriched: DataBases[]): DataBases[] {
    // Criterio acordado: activo == stty_id = 1
    return enriched.filter((r) => Number(r.db_state_type_id) === 1);
  }

  async findByEnvAndPortf(db_environment_type_id: number, db_portfolio_type_id: number): Promise<DataBases[]> {
    try {
      const all = await this.findAll();
      return all.filter(
        (db) => db.db_environment_type_id === db_environment_type_id && db.db_portfolio_type_id === db_portfolio_type_id,
      );
    } catch {
      throw new InternalServerErrorException(userMsg.noCargar);
    }
  }

  async findById(id: number): Promise<DataBases> {
    try {
      const db = await this.dataBasesRepository.findById(id);
      return {
        ...db,
        label_data_base: buildLabelDataBase(
          db.portfolio_type_name ?? '',
          db.environment_type_name ?? '',
        ),
      };
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id });
    }
  }

  async update(dataBases: DataBases): Promise<DataBases> {
    try {
      TblEnvironmentTypeId.create(dataBases.db_environment_type_id);
      TblPortfolioTypeId.create(dataBases.db_portfolio_type_id);
      TblStateTypeId.create(dataBases.db_state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.fkEnterosPositivos);
    }

    try {
      await this.environmentTypeRepository.findById(dataBases.db_environment_type_id);
      await this.portfolioTypeRepository.findById(dataBases.db_portfolio_type_id);
      await this.stateTypeRepository.findById(dataBases.db_state_type_id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado' });
    }

    let existing: DataBases;
    try {
      existing = await this.dataBasesRepository.findById(dataBases.db_id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id: dataBases.db_id });
    }

    const normalized = { ...dataBases, db_detail: capitalizeFirstWord(dataBases.db_detail) };
    const hasChanges =
      existing.db_environment_type_id !== normalized.db_environment_type_id ||
      existing.db_portfolio_type_id !== normalized.db_portfolio_type_id ||
      existing.db_state_type_id !== normalized.db_state_type_id ||
      existing.db_detail !== normalized.db_detail ||
      existing.db_responsible !== normalized.db_responsible ||
      jsonStableStringify(existing.db_bases) !== jsonStableStringify(normalized.db_bases);

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar', id: dataBases.db_id });
    }

    const dup = await this.dataBasesRepository.findByEnvAndPortfolio(
      normalized.db_environment_type_id,
      normalized.db_portfolio_type_id,
    );
    if (dup && dup.db_id !== existing.db_id) {
      throw new ConflictException({
        message: 'El registro ya existe',
        db_environment_type_id: normalized.db_environment_type_id,
        db_portfolio_type_id: normalized.db_portfolio_type_id,
        db_id: dup.db_id,
      });
    }

    const toSave: DataBases = {
      db_id: existing.db_id,
      db_environment_type_id: normalized.db_environment_type_id,
      db_portfolio_type_id: normalized.db_portfolio_type_id,
      db_bases: normalized.db_bases,
      db_detail: normalized.db_detail,
      db_state_type_id: normalized.db_state_type_id,
      db_created_at: existing.db_created_at,
      db_updated_at: new Date(),
      db_responsible: normalized.db_responsible,
    };
    try {
      return await this.dataBasesRepository.update(toSave);
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.dataBasesRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id });
    }
    try {
      await this.dataBasesRepository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}
