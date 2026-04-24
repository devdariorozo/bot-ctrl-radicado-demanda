// Responsabilidad: fachada de aplicación que usará el controller.

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PortfolioCityConfig } from '@domain/entities/portfolioCityConfig.entities';
import {
  PORTFOLIO_CITY_CONFIG_REPOSITORY,
  PortfolioCityConfigRepository,
  CreatePortfolioCityConfigInput,
} from '@domain/ports/portfolioCityConfig.ports';
import {
  DATABASES_REPOSITORY,
  DataBasesRepository,
  VCitiesRow,
} from '@domain/ports/dataBases.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { DataBasesService } from '@application/services/dataBases.service';
import { DataBasesId } from '@domain/value-objects/dataBases.valueobjects';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
import { CityViewsId } from '@domain/value-objects/portfolioCityConfig.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class PortfolioCityConfigService {
  constructor(
    @Inject(PORTFOLIO_CITY_CONFIG_REPOSITORY)
    private readonly portfolioCityConfigRepository: PortfolioCityConfigRepository,
    @Inject(DATABASES_REPOSITORY)
    private readonly dataBasesRepository: DataBasesRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
    private readonly dataBasesService: DataBasesService,
  ) {}

  async create(input: CreatePortfolioCityConfigInput): Promise<PortfolioCityConfig> {
    try {
      DataBasesId.create(input.id_data_bases);
      CityViewsId.create(input.id_city_views);
      TblStateTypeId.create(input.state_type_id);
    } catch {
      throw new BadRequestException('id_data_bases, id_city_views and state_type_id must be valid');
    }

    try {
      await this.dataBasesRepository.findById(input.id_data_bases);
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException('One or more related records not found (data_bases or state_type)');
    }

    const existing = await this.portfolioCityConfigRepository.findByDataBasesAndCityViews(
      input.id_data_bases,
      input.id_city_views,
    );
    if (existing) {
      throw new ConflictException(
        'PortfolioCityConfig for this id_data_bases and id_city_views already exists',
      );
    }

    const normalizedInput = { ...input, detail: capitalizeFirstWord(input.detail) };
    try {
      const created = await this.portfolioCityConfigRepository.create(normalizedInput);
      const state = await this.stateTypeRepository.findById(created.state_type_id);
      return { ...created, state_type_name: state.stty_type };
    } catch (error) {
      throw new InternalServerErrorException('Error creating portfolio city config');
    }
  }

  async findAll(): Promise<PortfolioCityConfig[]> {
    try {
      return await this.portfolioCityConfigRepository.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Error getting all portfolio city configs');
    }
  }

  async findById(id: number): Promise<PortfolioCityConfig> {
    try {
      const config = await this.portfolioCityConfigRepository.findById(id);
      const state = await this.stateTypeRepository.findById(config.state_type_id);
      // Enriquecer con información de portafolio (id y nombre), derivada de data_bases
      let portfolio_type_id: number | undefined;
      let portfolio_type_name: string | undefined;
      try {
        const db = await this.dataBasesService.findById(config.id_data_bases);
        portfolio_type_id = db.portfolio_type_id;
        portfolio_type_name = db.portfolio_type_name;
      } catch {
        // Si algo falla al enriquecer, devolvemos al menos el resto de la información
      }

      return {
        id: config.id,
        id_data_bases: config.id_data_bases,
        portfolio_type_id,
        portfolio_type_name,
        id_city_views: config.id_city_views,
        name_departament: config.name_departament,
        name_city: config.name_city,
        city: config.city,
        detail: config.detail,
        state_type_id: config.state_type_id,
        state_type_name: state.stty_type,
        created_at: config.created_at,
        updated_at: config.updated_at,
        responsible: config.responsible,
      };
    } catch (error) {
      throw new NotFoundException('No data found for the given id');
    }
  }

  async findByDataBasesAndCityViews(
    id_data_bases: number,
    id_city_views: number,
  ): Promise<PortfolioCityConfig> {
    try {
      DataBasesId.create(id_data_bases);
      CityViewsId.create(id_city_views);
    } catch {
      throw new BadRequestException('id_data_bases and id_city_views must be valid');
    }
    try {
      const config = await this.portfolioCityConfigRepository.findByDataBasesAndCityViews(
        id_data_bases,
        id_city_views,
      );
      if (!config) {
        throw new NotFoundException(
          'No se encontró configuración para los id_data_bases e id_city_views indicados',
        );
      }
      const state = await this.stateTypeRepository.findById(config.state_type_id);
      return { ...config, state_type_name: state.stty_type };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Error getting portfolio city config by data_bases and city_views',
      );
    }
  }

  async update(config: PortfolioCityConfig): Promise<PortfolioCityConfig> {
    try {
      DataBasesId.create(config.id_data_bases);
      CityViewsId.create(config.id_city_views);
      TblStateTypeId.create(config.state_type_id);
    } catch {
      throw new BadRequestException('id_data_bases, id_city_views and state_type_id must be valid');
    }

    let existing: PortfolioCityConfig;
    try {
      existing = await this.portfolioCityConfigRepository.findById(config.id);
    } catch {
      throw new NotFoundException('No data found for the given id');
    }

    try {
      await this.dataBasesRepository.findById(config.id_data_bases);
      await this.stateTypeRepository.findById(config.state_type_id);
    } catch {
      throw new NotFoundException('One or more related records not found');
    }

    const other = await this.portfolioCityConfigRepository.findByDataBasesAndCityViews(
      config.id_data_bases,
      config.id_city_views,
    );
    if (other && other.id !== config.id) {
      throw new ConflictException(
        'Another config already exists for this id_data_bases and id_city_views',
      );
    }

    const normalized = { ...config, detail: capitalizeFirstWord(config.detail) };
    const hasChanges =
      existing.id_data_bases !== normalized.id_data_bases ||
      existing.id_city_views !== normalized.id_city_views ||
      existing.name_departament !== normalized.name_departament ||
      existing.city !== normalized.city ||
      existing.name_city !== normalized.name_city ||
      existing.detail !== normalized.detail ||
      existing.state_type_id !== normalized.state_type_id ||
      existing.responsible !== normalized.responsible;

    if (!hasChanges) {
      throw new BadRequestException('No changes to update');
    }

    try {
      const updated = await this.portfolioCityConfigRepository.update(normalized);
      const state = await this.stateTypeRepository.findById(updated.state_type_id);
      return { ...updated, state_type_name: state.stty_type };
    } catch (error) {
      throw new InternalServerErrorException('Error updating portfolio city config');
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.portfolioCityConfigRepository.findById(id);
    } catch (error) {
      throw new NotFoundException('No data found for the given id');
    }
    try {
      await this.portfolioCityConfigRepository.delete(id);
    } catch (error) {
      throw new InternalServerErrorException('Error deleting portfolio city config');
    }
  }

  /**
   * Consulta la vista v_cities en la primera base de datos del registro data_bases indicado.
   * Retorna todos los registros (id, city_name, department, city).
   */
  async vCitiesFetch(id_data_bases: number): Promise<VCitiesRow[]> {
    try {
      DataBasesId.create(id_data_bases);
    } catch {
      throw new BadRequestException('id_data_bases must be a valid positive integer');
    }
    try {
      await this.dataBasesRepository.findById(id_data_bases);
    } catch {
      throw new NotFoundException('data_bases record not found');
    }
    try {
      return await this.dataBasesRepository.fetchVCitiesFromFirstBase(id_data_bases);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error querying v_cities view';
      throw new InternalServerErrorException(message);
    }
  }
}
