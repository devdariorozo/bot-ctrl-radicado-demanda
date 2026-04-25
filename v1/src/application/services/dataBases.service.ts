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
import { TBL_ENVIRONMENT_TYPE_REPOSITORY, TblEnvironmentTypeRepository } from '@domain/ports/tblEnvironmentType.ports';
import { TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/tblPortfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblEnvironmentTypeId } from '@domain/value-objects/tblEnvironmentType.valueobjects';
import { TblPortfolioTypeId } from '@domain/value-objects/tblPortfolioType.valueobjects';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { jsonStableStringify } from '@application/utils/jsonStableStringify.utils';

function buildLabelDataBase(portfolioTypeName: string, environmentTypeName: string): string {
  const env = (environmentTypeName || '').trim().toLowerCase();
  if (env === 'pro') return portfolioTypeName;
  return `${portfolioTypeName} ${environmentTypeName}`.trim();
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
      TblEnvironmentTypeId.create(input.environment_type_id);
      TblPortfolioTypeId.create(input.portfolio_type_id);
      TblStateTypeId.create(input.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.fkEnterosPositivos);
    }

    try {
      await this.environmentTypeRepository.findById(input.environment_type_id);
      await this.portfolioTypeRepository.findById(input.portfolio_type_id);
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado' });
    }

    if (!input.bases || typeof input.bases !== 'object' || Object.keys(input.bases).length === 0) {
      throw new UnprocessableEntityException(userMsg.alMenosUnaBase);
    }

    const duplicate = await this.dataBasesRepository.findByDuplicateBases(input.bases);
    if (duplicate) {
      throw new ConflictException({ message: 'El registro ya existe', db_bases: input.bases });
    }

    const normalizedInput = { ...input, detail: capitalizeFirstWord(input.detail) };
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
        const env = envMap.get(db.environment_type_id);
        const portfolio = portfolioMap.get(db.portfolio_type_id);
        const state = stateMap.get(db.state_type_id);
        const envType = env?.env_type ?? '';
        const portfolioType = portfolio?.porty_type ?? '';
        const stateType = state?.stty_type ?? '';
        const pStateName = portfolio
          ? stateMap.get(portfolio.porty_state_type_id)?.stty_type ?? ''
          : '';
        return {
          id: db.id,
          environment_type_id: db.environment_type_id,
          environment_type_name: envType,
          portfolio_type_id: db.portfolio_type_id,
          portfolio_type_name: portfolioType,
          label_data_base: buildLabelDataBase(portfolioType, envType),
          bases: db.bases,
          detail: db.detail,
          state_type_id: db.state_type_id,
          state_type_name: stateType,
          portfolio_state_type_name: pStateName,
          created_at: db.created_at,
          updated_at: db.updated_at,
          responsible: db.responsible,
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
    return enriched.filter((r) => {
      const n = (r.state_type_name ?? '').toLowerCase();
      return n.length > 0 && !n.includes('inactiv');
    });
  }

  async findByEnvAndPortf(environment_type_id: number, portfolio_type_id: number): Promise<DataBases[]> {
    try {
      const all = await this.findAll();
      return all.filter(
        (db) => db.environment_type_id === environment_type_id && db.portfolio_type_id === portfolio_type_id,
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
      TblEnvironmentTypeId.create(dataBases.environment_type_id);
      TblPortfolioTypeId.create(dataBases.portfolio_type_id);
      TblStateTypeId.create(dataBases.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.fkEnterosPositivos);
    }

    try {
      await this.environmentTypeRepository.findById(dataBases.environment_type_id);
      await this.portfolioTypeRepository.findById(dataBases.portfolio_type_id);
      await this.stateTypeRepository.findById(dataBases.state_type_id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado' });
    }

    let existing: DataBases;
    try {
      existing = await this.dataBasesRepository.findById(dataBases.id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id: dataBases.id });
    }

    const normalized = { ...dataBases, detail: capitalizeFirstWord(dataBases.detail) };
    const hasChanges =
      existing.environment_type_id !== normalized.environment_type_id ||
      existing.portfolio_type_id !== normalized.portfolio_type_id ||
      existing.state_type_id !== normalized.state_type_id ||
      existing.detail !== normalized.detail ||
      existing.responsible !== normalized.responsible ||
      jsonStableStringify(existing.bases) !== jsonStableStringify(normalized.bases);

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar', id: dataBases.id });
    }

    const toSave: DataBases = {
      id: existing.id,
      environment_type_id: normalized.environment_type_id,
      portfolio_type_id: normalized.portfolio_type_id,
      bases: normalized.bases,
      detail: normalized.detail,
      state_type_id: normalized.state_type_id,
      created_at: existing.created_at,
      updated_at: new Date(),
      responsible: normalized.responsible,
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
