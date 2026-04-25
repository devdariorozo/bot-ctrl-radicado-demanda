// Responsabilidad: fachada de aplicación que usará el controller.

import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { TblStateType } from "@domain/entities/tblStateType.entities";
import { CreateTblStateTypeInput, TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from "@domain/ports/tblStateType.ports";
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class TblStateTypeService {
    constructor(
        @Inject(TBL_STATE_TYPE_REPOSITORY)
        private readonly tblStateTypeRepository: TblStateTypeRepository,
    ) {}

    async create(tblStateType: CreateTblStateTypeInput): Promise<TblStateType> {
        const duplicate = await this.tblStateTypeRepository.findByDuplicate(tblStateType.stty_type);
        if (duplicate) {
            throw new ConflictException({ message: 'El registro ya existe', stty_type: tblStateType.stty_type });
        }
        const normalized = { ...tblStateType, stty_detail: capitalizeFirstWord(tblStateType.stty_detail) };
        try {
            return await this.tblStateTypeRepository.create(normalized);
        } catch (error) {
            throw new InternalServerErrorException(userMsg.noCrear);
        }
    }

    async findAll(): Promise<TblStateType[]> {
        try {
            return await this.tblStateTypeRepository.findAll();
        } catch (error) {
            throw new InternalServerErrorException(userMsg.noListar);
        }
    }

    async findAllActive(): Promise<TblStateType[]> {
        try {
            return await this.tblStateTypeRepository.findAllActive();
        } catch (error) {
            throw new InternalServerErrorException(userMsg.noListar);
        }
    }

    async findById(stty_id: number): Promise<TblStateType> {
        try {
            return await this.tblStateTypeRepository.findById(stty_id);
        } catch (error) {
            throw new NotFoundException({ message: 'Registro no encontrado', id: stty_id });
        }
    }

    async update(tblStateType: TblStateType): Promise<TblStateType> {
        let existing: TblStateType;
        try {
            existing = await this.tblStateTypeRepository.findById(tblStateType.stty_id);
        } catch {
            throw new NotFoundException({ message: 'Registro no encontrado', id: tblStateType.stty_id });
        }

        const normalized = { ...tblStateType, stty_detail: capitalizeFirstWord(tblStateType.stty_detail) };
        const hasChanges =
            existing.stty_type !== normalized.stty_type ||
            existing.stty_detail !== normalized.stty_detail ||
            existing.stty_responsible !== normalized.stty_responsible;

        if (!hasChanges) {
            throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar', id: tblStateType.stty_id });
        }

        const otraFilaMismoTipo = await this.tblStateTypeRepository.findByDuplicate(normalized.stty_type);
        if (otraFilaMismoTipo && otraFilaMismoTipo.stty_id !== existing.stty_id) {
            throw new ConflictException({ message: userMsg.nombreTipoCatalogoEnUso, stty_type: normalized.stty_type });
        }

        const toSave: TblStateType = {
            stty_id: existing.stty_id,
            stty_type: normalized.stty_type,
            stty_detail: normalized.stty_detail,
            stty_responsible: normalized.stty_responsible,
            stty_created_at: existing.stty_created_at,
            stty_updated_at: new Date(),
        };
        try {
            return await this.tblStateTypeRepository.update(toSave);
        } catch (err) {
            const isDuplicate =
                err instanceof QueryFailedError &&
                ((err as QueryFailedError & { code?: string; driverError?: { code?: string } }).code ===
                    'ER_DUP_ENTRY' ||
                    (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code ===
                        'ER_DUP_ENTRY' ||
                    (err as Error).message?.includes('Duplicate entry'));
            if (isDuplicate) {
                throw new ConflictException({ message: userMsg.nombreTipoCatalogoEnUso, stty_type: normalized.stty_type });
            }
            throw new InternalServerErrorException(userMsg.noActualizar);
        }
    }

    async delete(stty_id: number): Promise<void> {
        try {
            await this.tblStateTypeRepository.findById(stty_id);
        } catch (error) {
            throw new NotFoundException({ message: 'Registro no encontrado', id: stty_id });
        }
        try {
            await this.tblStateTypeRepository.delete(stty_id);
        } catch (error) {
            throw new InternalServerErrorException(userMsg.noEliminar);
        }
    }
}
