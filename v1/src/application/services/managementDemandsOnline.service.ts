// Responsabilidad: fachada de aplicación que usará el controller para management_demands_online.

import {
  UnprocessableEntityException,
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
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/stateType.ports';
import { AMOUNT_TYPE_REPOSITORY, AmountTypeRepository } from '@domain/ports/amountType.ports';
import { PORTFOLIO_CITY_CONFIG_REPOSITORY, PortfolioCityConfigRepository } from '@domain/ports/portfolioCityConfig.ports';
import { TblStateTypeId } from '@domain/value-objects/stateType.valueobjects';
import { userMsg } from '@application/utils/apiUserMessages.utils';

@Injectable()
export class ManagementDemandsOnlineService {
  constructor(
    @Inject(MANAGEMENT_DEMANDS_ONLINE_REPOSITORY)
    private readonly managementDemandsOnlineRepository: ManagementDemandsOnlineRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
    @Inject(AMOUNT_TYPE_REPOSITORY)
    private readonly amountTypeRepository: AmountTypeRepository,
    @Inject(PORTFOLIO_CITY_CONFIG_REPOSITORY)
    private readonly portfolioCityConfigRepository: PortfolioCityConfigRepository,
  ) {}

  async create(input: CreateManagementDemandsOnlineInput): Promise<ManagementDemandsOnline> {
    try {
      TblStateTypeId.create(input.state_type_id ?? 1);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    try {
      await this.stateTypeRepository.findById(input.state_type_id ?? 1);
    } catch {
      throw new NotFoundException({ message: userMsg.noTipoEstado });
    }

    try {
      await this.amountTypeRepository.findById(input.amount_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noTipoCuantia });
    }

    try {
      await this.portfolioCityConfigRepository.findById(input.portfolio_city_config_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noConfigCiudad });
    }

    try {
      return await this.managementDemandsOnlineRepository.create(input);
    } catch {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(filters?: FindAllManagementDemandsOnlineFilters): Promise<ManagementDemandsOnline[]> {
    try {
      return await this.managementDemandsOnlineRepository.findAll(filters);
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findById(id: number): Promise<ManagementDemandsOnline> {
    try {
      const record = await this.managementDemandsOnlineRepository.findById(id);
      const stateType = await this.stateTypeRepository.findById(record.state_type_id);
      return {
        ...record,
        state_type_name: stateType.stty_type,
      };
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
  }

  async update(record: ManagementDemandsOnline): Promise<ManagementDemandsOnline> {
    try {
      TblStateTypeId.create(record.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    try {
      await this.managementDemandsOnlineRepository.findById(record.id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    try {
      await this.stateTypeRepository.findById(record.state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noTipoEstado });
    }

    try {
      await this.amountTypeRepository.findById(record.amount_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noTipoCuantia });
    }

    try {
      await this.portfolioCityConfigRepository.findById(record.portfolio_city_config_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noConfigCiudad });
    }

    try {
      return await this.managementDemandsOnlineRepository.update(record);
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.managementDemandsOnlineRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    try {
      await this.managementDemandsOnlineRepository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}
