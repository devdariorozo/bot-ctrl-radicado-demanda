// Responsabilidad: fachada de aplicación que usará el controller.

import {
  UnprocessableEntityException,
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
import { userMsg } from '@application/utils/apiUserMessages.utils';
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
      throw new UnprocessableEntityException(userMsg.vinculosBaseCiudadEstado);
    }

    try {
      await this.dataBasesRepository.findById(input.id_data_bases);
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noRelacion });
    }

    const existing = await this.portfolioCityConfigRepository.findByDataBasesAndCityViews(
      input.id_data_bases,
      input.id_city_views,
    );
    if (existing) {
      throw new ConflictException({ message: userMsg.configCiudadDuplicada });
    }

    const normalizedInput = { ...input, detail: capitalizeFirstWord(input.detail) };
    try {
      const created = await this.portfolioCityConfigRepository.create(normalizedInput);
      const state = await this.stateTypeRepository.findById(created.state_type_id);
      return { ...created, state_type_name: state.stty_type };
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(): Promise<PortfolioCityConfig[]> {
    try {
      return await this.portfolioCityConfigRepository.findAll();
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noListar);
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
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
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
      throw new UnprocessableEntityException(userMsg.vinculosBaseCiudad);
    }
    try {
      const config = await this.portfolioCityConfigRepository.findByDataBasesAndCityViews(
        id_data_bases,
        id_city_views,
      );
      if (!config) {
        throw new NotFoundException({ message: userMsg.registroNoEncontrado });
      }
      const state = await this.stateTypeRepository.findById(config.state_type_id);
      return { ...config, state_type_name: state.stty_type };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(userMsg.noCargar);
    }
  }

  async update(config: PortfolioCityConfig): Promise<PortfolioCityConfig> {
    try {
      DataBasesId.create(config.id_data_bases);
      CityViewsId.create(config.id_city_views);
      TblStateTypeId.create(config.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.vinculosBaseCiudadEstado);
    }

    let existing: PortfolioCityConfig;
    try {
      existing = await this.portfolioCityConfigRepository.findById(config.id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    try {
      await this.dataBasesRepository.findById(config.id_data_bases);
      await this.stateTypeRepository.findById(config.state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noRelacion });
    }

    const other = await this.portfolioCityConfigRepository.findByDataBasesAndCityViews(
      config.id_data_bases,
      config.id_city_views,
    );
    if (other && other.id !== config.id) {
      throw new ConflictException({ message: userMsg.configCiudadEnUso });
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
      throw new UnprocessableEntityException({ message: userMsg.sinCambios });
    }

    try {
      const updated = await this.portfolioCityConfigRepository.update(normalized);
      const state = await this.stateTypeRepository.findById(updated.state_type_id);
      return { ...updated, state_type_name: state.stty_type };
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.portfolioCityConfigRepository.findById(id);
    } catch (error) {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
    try {
      await this.portfolioCityConfigRepository.delete(id);
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noEliminar);
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
      throw new UnprocessableEntityException(userMsg.idBasesPositivo);
    }
    try {
      await this.dataBasesRepository.findById(id_data_bases);
    } catch {
      throw new NotFoundException({ message: userMsg.notFoundBases });
    }
    try {
      return await this.dataBasesRepository.fetchVCitiesFromFirstBase(id_data_bases);
    } catch (error) {
      throw new InternalServerErrorException(userMsg.errorListadoCiudades);
    }
  }
}
