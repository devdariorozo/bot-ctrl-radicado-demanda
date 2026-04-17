// Responsabilidad: fachada de aplicación que usará el controller para management_demands_online.

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { ManagementDemandsOnline } from '@domain/entities/managementDemandsOnline.entities';
import {
  MANAGEMENT_DEMANDS_ONLINE_REPOSITORY,
  ManagementDemandsOnlineRepository,
  CreateManagementDemandsOnlineInput,
  FindAllManagementDemandsOnlineFilters,
} from '@domain/ports/managementDemandsOnline.ports';
import { STATE_TYPE_REPOSITORY, StateTypeRepository } from '@domain/ports/stateType.ports';
import { AMOUNT_TYPE_REPOSITORY, AmountTypeRepository } from '@domain/ports/amountType.ports';
import { PORTFOLIO_CITY_CONFIG_REPOSITORY, PortfolioCityConfigRepository } from '@domain/ports/portfolioCityConfig.ports';
import { StateTypeId } from '@domain/value-objects/stateType.valueobjects';

@Injectable()
export class ManagementDemandsOnlineService {
  constructor(
    @Inject(MANAGEMENT_DEMANDS_ONLINE_REPOSITORY)
    private readonly managementDemandsOnlineRepository: ManagementDemandsOnlineRepository,
    @Inject(STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: StateTypeRepository,
    @Inject(AMOUNT_TYPE_REPOSITORY)
    private readonly amountTypeRepository: AmountTypeRepository,
    @Inject(PORTFOLIO_CITY_CONFIG_REPOSITORY)
    private readonly portfolioCityConfigRepository: PortfolioCityConfigRepository,
  ) {}

  async create(input: CreateManagementDemandsOnlineInput): Promise<ManagementDemandsOnline> {
    try {
      StateTypeId.create(input.state_type_id ?? 1);
    } catch {
      throw new BadRequestException('state_type_id debe ser un número entero positivo');
    }

    try {
      await this.stateTypeRepository.findById(input.state_type_id ?? 1);
    } catch {
      throw new NotFoundException('No se encontraron datos para el tipo de estado indicado');
    }

    try {
      await this.amountTypeRepository.findById(input.amount_type_id);
    } catch {
      throw new NotFoundException('No se encontraron datos para el tipo de cuantía indicado');
    }

    try {
      await this.portfolioCityConfigRepository.findById(input.portfolio_city_config_id);
    } catch {
      throw new NotFoundException('No se encontraron datos para la configuración de ciudad indicada');
    }

    try {
      return await this.managementDemandsOnlineRepository.create(input);
    } catch {
      throw new InternalServerErrorException('Error al crear el registro de gestión de demandas');
    }
  }

  async findAll(filters?: FindAllManagementDemandsOnlineFilters): Promise<ManagementDemandsOnline[]> {
    try {
      return await this.managementDemandsOnlineRepository.findAll(filters);
    } catch {
      throw new InternalServerErrorException('Error al obtener los registros de gestión de demandas');
    }
  }

  async findById(id: number): Promise<ManagementDemandsOnline> {
    try {
      const record = await this.managementDemandsOnlineRepository.findById(id);
      const stateType = await this.stateTypeRepository.findById(record.state_type_id);
      return {
        ...record,
        state_type_name: stateType.type,
      };
    } catch {
      throw new NotFoundException('No se encontraron datos para el id indicado');
    }
  }

  async update(record: ManagementDemandsOnline): Promise<ManagementDemandsOnline> {
    try {
      StateTypeId.create(record.state_type_id);
    } catch {
      throw new BadRequestException('state_type_id debe ser un número entero positivo');
    }

    try {
      await this.managementDemandsOnlineRepository.findById(record.id);
    } catch {
      throw new NotFoundException('No se encontraron datos para el id indicado');
    }

    try {
      await this.stateTypeRepository.findById(record.state_type_id);
    } catch {
      throw new NotFoundException('No se encontraron datos para el tipo de estado indicado');
    }

    try {
      await this.amountTypeRepository.findById(record.amount_type_id);
    } catch {
      throw new NotFoundException('No se encontraron datos para el tipo de cuantía indicado');
    }

    try {
      await this.portfolioCityConfigRepository.findById(record.portfolio_city_config_id);
    } catch {
      throw new NotFoundException('No se encontraron datos para la configuración de ciudad indicada');
    }

    try {
      return await this.managementDemandsOnlineRepository.update(record);
    } catch {
      throw new InternalServerErrorException('Error al actualizar el registro de gestión de demandas');
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.managementDemandsOnlineRepository.findById(id);
    } catch {
      throw new NotFoundException('No se encontraron datos para el id indicado');
    }

    try {
      await this.managementDemandsOnlineRepository.delete(id);
    } catch {
      throw new InternalServerErrorException('Error al eliminar el registro de gestión de demandas');
    }
  }
}
