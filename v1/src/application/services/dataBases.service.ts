// Responsabilidad: fachada de aplicación que usará el controller.

import { BadRequestException, ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataBases } from '@domain/entities/dataBases.entities';
import { CreateDataBasesInput, DataBasesRepository, DATABASES_REPOSITORY } from '@domain/ports/dataBases.ports';
import { TBL_ENVIRONMENT_TYPE_REPOSITORY, TblEnvironmentTypeRepository } from '@domain/ports/tblEnvironmentType.ports';
import { TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/tblPortfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblEnvironmentTypeId } from '@domain/value-objects/tblEnvironmentType.valueobjects';
import { TblPortfolioTypeId } from '@domain/value-objects/tblPortfolioType.valueobjects';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';

/** Construye label_data_base: si environment es "pro" solo portfolio, sino "portfolio environment". */
function buildLabelDataBase(portfolioTypeName: string, environmentTypeName: string): string {
  const env = (environmentTypeName || '').trim().toLowerCase();
  if (env === 'pro') return portfolioTypeName;
  return `${portfolioTypeName} ${environmentTypeName}`.trim();
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

  // Crear un nuevo registro de bases
  async create(input: CreateDataBasesInput): Promise<DataBases> {
    // Validar que los IDs sean enteros positivos
    try {
      TblEnvironmentTypeId.create(input.environment_type_id);
      TblPortfolioTypeId.create(input.portfolio_type_id);
      TblStateTypeId.create(input.state_type_id);
    } catch {
      throw new BadRequestException('All foreign keys must be positive integers');
    }

    // Validar que existan en BD
    try {
      await this.environmentTypeRepository.findById(input.environment_type_id);
      await this.portfolioTypeRepository.findById(input.portfolio_type_id);
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException('One or more related records not found');
    }

    // Validar que bases no sea vacío
    if (!input.bases || typeof input.bases !== 'object' || Object.keys(input.bases).length === 0) {
      throw new BadRequestException('At least one base must be provided');
    }

    // Evitar duplicados por combinación environment/portfolio
    const existing = (await this.dataBasesRepository.findAll()).find(
      (db) =>
        db.environment_type_id === input.environment_type_id &&
        db.portfolio_type_id === input.portfolio_type_id,
    );
    if (existing) {
      throw new ConflictException('DataBases record for this environment/portfolio already exists');
    }

    const normalizedInput = { ...input, detail: capitalizeFirstWord(input.detail) };
    try {
      return await this.dataBasesRepository.create(normalizedInput);
    } catch (error) {
      throw new InternalServerErrorException('Error creating dataBases record');
    }
  }

  // Obtener todos los registros de bases (enriquecidos con _name y label_data_base)
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
          created_at: db.created_at,
          updated_at: db.updated_at,
          responsible: db.responsible,
        };
      });
    } catch (error) {
      throw new InternalServerErrorException('Error getting all dataBases records');
    }
  }

  // Obtener registros de bases por combinación entorno/cartera (enriquecidos con _name y label_data_base)
  async findByEnvAndPortf(
    environment_type_id: number,
    portfolio_type_id: number,
  ): Promise<DataBases[]> {
    try {
      const all = await this.findAll();
      return all.filter(
        (db) =>
          db.environment_type_id === environment_type_id &&
          db.portfolio_type_id === portfolio_type_id,
      );
    } catch (error) {
      throw new InternalServerErrorException('Error getting dataBases by environment and portfolio');
    }
  }

  // Obtener un registro de bases por su id
  async findById(id: number): Promise<DataBases> {
    try {
      const db = await this.dataBasesRepository.findById(id);
      const [env, portfolio, state] = await Promise.all([
        this.environmentTypeRepository.findById(db.environment_type_id),
        this.portfolioTypeRepository.findById(db.portfolio_type_id),
        this.stateTypeRepository.findById(db.state_type_id),
      ]);

      return {
        id: db.id,
        environment_type_id: db.environment_type_id,
        environment_type_name: env.env_type,
        portfolio_type_id: db.portfolio_type_id,
        portfolio_type_name: portfolio.porty_type,
        label_data_base: buildLabelDataBase(portfolio.porty_type, env.env_type),
        bases: db.bases,
        detail: db.detail,
        state_type_id: db.state_type_id,
        state_type_name: state.stty_type,
        created_at: db.created_at,
        updated_at: db.updated_at,
        responsible: db.responsible,
      };
    } catch (error) {
      throw new NotFoundException('No data found for the given id');
    }
  }

  // Actualizar un registro de bases
  async update(dataBases: DataBases): Promise<DataBases> {
    // Validar que los IDs sean enteros positivos
    try {
      TblEnvironmentTypeId.create(dataBases.environment_type_id);
      TblPortfolioTypeId.create(dataBases.portfolio_type_id);
      TblStateTypeId.create(dataBases.state_type_id);
    } catch {
      throw new BadRequestException('All foreign keys must be positive integers');
    }

    let existing: DataBases;
    try {
      existing = await this.dataBasesRepository.findById(dataBases.id);
    } catch {
      throw new NotFoundException('No data found for the given id');
    }

    const normalized = { ...dataBases, detail: capitalizeFirstWord(dataBases.detail) };
    const hasChanges =
      existing.environment_type_id !== normalized.environment_type_id ||
      existing.portfolio_type_id !== normalized.portfolio_type_id ||
      existing.state_type_id !== normalized.state_type_id ||
      existing.detail !== normalized.detail ||
      existing.responsible !== normalized.responsible ||
      JSON.stringify(existing.bases) !== JSON.stringify(normalized.bases);

    if (!hasChanges) {
      throw new BadRequestException('No changes to update');
    }

    try {
      return await this.dataBasesRepository.update(normalized);
    } catch (error) {
      throw new InternalServerErrorException('Error updating dataBases record');
    }
  }

  // Eliminar un registro de bases
  async delete(id: number): Promise<void> {
    try {
      await this.dataBasesRepository.findById(id);
    } catch (error) {
      throw new NotFoundException('No data found for the given id');
    }
    try {
      await this.dataBasesRepository.delete(id);
    } catch (error) {
      throw new InternalServerErrorException('Error deleting dataBases record');
    }
  }
}

