// Responsabilidad: fachada de aplicación que usará el controller para amount_type.

import {
  UnprocessableEntityException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { AmountType } from '@domain/entities/amountType.entities';
import { AMOUNT_TYPE_REPOSITORY, AmountTypeRepository, CreateAmountTypeInput } from '@domain/ports/amountType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/stateType.ports';
import { TblStateTypeId } from '@domain/value-objects/stateType.valueobjects';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class AmountTypeService {
  constructor(
    @Inject(AMOUNT_TYPE_REPOSITORY)
    private readonly amountTypeRepository: AmountTypeRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
  ) {}

  async create(input: CreateAmountTypeInput): Promise<AmountType> {
    try {
      TblStateTypeId.create(input.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    try {
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noTipoEstado });
    }

    const duplicate = await this.amountTypeRepository.findByDuplicate(input.type);
    if (duplicate) {
      throw new ConflictException({ message: 'Ya existe un tipo de cuantía con ese nombre.' });
    }

    const normalized: CreateAmountTypeInput = {
      ...input,
      detail: capitalizeFirstWord(input.detail),
    };

    try {
      return await this.amountTypeRepository.create(normalized);
    } catch {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(): Promise<AmountType[]> {
    try {
      return await this.amountTypeRepository.findAll();
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findById(id: number): Promise<AmountType> {
    try {
      const amount = await this.amountTypeRepository.findById(id);
      const stateType = await this.stateTypeRepository.findById(amount.state_type_id);
      return {
        ...amount,
        state_type_name: stateType.stty_type,
      };
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
  }

  async update(amountType: AmountType): Promise<AmountType> {
    try {
      TblStateTypeId.create(amountType.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    let existing: AmountType;
    try {
      existing = await this.amountTypeRepository.findById(amountType.id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    const normalized: AmountType = {
      ...amountType,
      detail: capitalizeFirstWord(amountType.detail),
    };

    const arraysEqual = (a?: string[] | null, b?: string[] | null): boolean => {
      if (a === b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      return a.every((val, idx) => val === b[idx]);
    };

    const hasChanges =
      existing.type !== normalized.type ||
      !arraysEqual(existing.specialty_process, normalized.specialty_process) ||
      !arraysEqual(existing.class_process, normalized.class_process) ||
      existing.detail !== normalized.detail ||
      existing.state_type_id !== normalized.state_type_id ||
      existing.responsible !== normalized.responsible;

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: userMsg.sinCambios });
    }

    if (existing.type !== normalized.type) {
      const duplicate = await this.amountTypeRepository.findByDuplicate(normalized.type);
      if (duplicate && duplicate.id !== amountType.id) {
        throw new ConflictException({ message: 'Ya existe otro tipo de cuantía con ese nombre.' });
      }
    }

    try {
      return await this.amountTypeRepository.update(normalized);
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.amountTypeRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    try {
      await this.amountTypeRepository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}
