// Responsabilidad: fachada de aplicación que usará el controller para amount_type.

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { AmountType } from '@domain/entities/amountType.entities';
import { AMOUNT_TYPE_REPOSITORY, AmountTypeRepository, CreateAmountTypeInput } from '@domain/ports/amountType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
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
      throw new BadRequestException('state_type_id debe ser un número entero positivo');
    }

    try {
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException('No se encontraron datos para el tipo de estado indicado');
    }

    const duplicate = await this.amountTypeRepository.findByDuplicate(input.type);
    if (duplicate) {
      throw new ConflictException('Ya existe un tipo de cuantía con ese nombre');
    }

    const normalized: CreateAmountTypeInput = {
      ...input,
      detail: capitalizeFirstWord(input.detail),
    };

    try {
      return await this.amountTypeRepository.create(normalized);
    } catch {
      throw new InternalServerErrorException('Error al crear el tipo de cuantía');
    }
  }

  async findAll(): Promise<AmountType[]> {
    try {
      return await this.amountTypeRepository.findAll();
    } catch {
      throw new InternalServerErrorException('Error al obtener los tipos de cuantía');
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
      throw new NotFoundException('No se encontraron datos para el id indicado');
    }
  }

  async update(amountType: AmountType): Promise<AmountType> {
    try {
      TblStateTypeId.create(amountType.state_type_id);
    } catch {
      throw new BadRequestException('state_type_id debe ser un número entero positivo');
    }

    let existing: AmountType;
    try {
      existing = await this.amountTypeRepository.findById(amountType.id);
    } catch {
      throw new NotFoundException('No se encontraron datos para el id indicado');
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
      throw new BadRequestException('No hay cambios para actualizar');
    }

    if (existing.type !== normalized.type) {
      const duplicate = await this.amountTypeRepository.findByDuplicate(normalized.type);
      if (duplicate && duplicate.id !== amountType.id) {
        throw new ConflictException('Ya existe otro tipo de cuantía con ese nombre');
      }
    }

    try {
      return await this.amountTypeRepository.update(normalized);
    } catch {
      throw new InternalServerErrorException('Error al actualizar el tipo de cuantía');
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.amountTypeRepository.findById(id);
    } catch {
      throw new NotFoundException('No se encontraron datos para el id indicado');
    }

    try {
      await this.amountTypeRepository.delete(id);
    } catch {
      throw new InternalServerErrorException('Error al eliminar el tipo de cuantía');
    }
  }
}
