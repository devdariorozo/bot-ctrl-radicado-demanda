// Responsabilidad: fachada de aplicación que usará el controller.

import { BadRequestException, ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataBases } from '@domain/entities/dataBases.entities';
import { CreateDataBasesInput, DataBasesRepository, DATABASES_REPOSITORY } from '@domain/ports/dataBases.ports';
import { ENVIRONMENT_TYPE_REPOSITORY, EnvironmentTypeRepository } from '@domain/ports/environmentType.ports';
import { PORTFOLIO_TYPE_REPOSITORY, PortfolioTypeRepository } from '@domain/ports/portfolioType.ports';
import { STATE_TYPE_REPOSITORY, StateTypeRepository } from '@domain/ports/stateType.ports';
import { EnvironmentTypeId } from '@domain/value-objects/environmentType.valueobjects';
import { PortfolioTypeId } from '@domain/value-objects/portfolioType.valueobjects';
import { StateTypeId } from '@domain/value-objects/stateType.valueobjects';
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
    @Inject(ENVIRONMENT_TYPE_REPOSITORY)
    private readonly environmentTypeRepository: EnvironmentTypeRepository,
    @Inject(PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: PortfolioTypeRepository,
    @Inject(STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: StateTypeRepository,
  ) {}

  // Crear un nuevo registro de bases
  async create(input: CreateDataBasesInput): Promise<DataBases> {
    // Validar que los IDs sean enteros positivos
    try {
      EnvironmentTypeId.create(input.environment_type_id);
      PortfolioTypeId.create(input.portfolio_type_id);
      StateTypeId.create(input.state_type_id);
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
      const envMap = new Map(envTypes.map((e) => [e.id, e]));
      const portfolioMap = new Map(portfolioTypes.map((p) => [p.id, p]));
      const stateMap = new Map(stateTypes.map((s) => [s.id, s]));
      return dbs.map((db) => {
        const env = envMap.get(db.environment_type_id);
        const portfolio = portfolioMap.get(db.portfolio_type_id);
        const state = stateMap.get(db.state_type_id);
        const envType = env?.type ?? '';
        const portfolioType = portfolio?.type ?? '';
        const stateType = state?.type ?? '';
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
        environment_type_name: env.type,
        portfolio_type_id: db.portfolio_type_id,
        portfolio_type_name: portfolio.type,
        label_data_base: buildLabelDataBase(portfolio.type, env.type),
        bases: db.bases,
        detail: db.detail,
        state_type_id: db.state_type_id,
        state_type_name: state.type,
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
      EnvironmentTypeId.create(dataBases.environment_type_id);
      PortfolioTypeId.create(dataBases.portfolio_type_id);
      StateTypeId.create(dataBases.state_type_id);
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

