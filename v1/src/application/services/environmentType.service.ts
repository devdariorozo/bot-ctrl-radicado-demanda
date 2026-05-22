// Responsabilidad: fachada de aplicación que usará el controller.

import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UnprocessableEntityException } from '@nestjs/common';
import { TblEnvironmentType } from "@domain/entities/environmentType.entities";
import { CreateTblEnvironmentTypeInput, TBL_ENVIRONMENT_TYPE_REPOSITORY, TblEnvironmentTypeRepository } from "@domain/ports/environmentType.ports";
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class TblEnvironmentTypeService {
    constructor(
        @Inject(TBL_ENVIRONMENT_TYPE_REPOSITORY)
        private readonly tblEnvironmentTypeRepository: TblEnvironmentTypeRepository,
    ) {}

    async create(tblEnvironmentType: CreateTblEnvironmentTypeInput): Promise<TblEnvironmentType> {
        const duplicate = await this.tblEnvironmentTypeRepository.findByDuplicate(tblEnvironmentType.env_type);

        if (duplicate) {
            throw new ConflictException({ message: 'El registro ya existe', env_type: tblEnvironmentType.env_type });
        }

        const normalized = { ...tblEnvironmentType, env_detail: capitalizeFirstWord(tblEnvironmentType.env_detail) };
        try {
            return await this.tblEnvironmentTypeRepository.create(normalized);
        } catch (error) {
            throw new InternalServerErrorException(userMsg.noCrear);
        }
    }

    async findAll(): Promise<TblEnvironmentType[]> {
        try {
            return await this.tblEnvironmentTypeRepository.findAll();
        } catch (error) {
            throw new InternalServerErrorException(userMsg.noListar);
        }
    }

    async findById(env_id: number): Promise<TblEnvironmentType> {
        try {
            return await this.tblEnvironmentTypeRepository.findById(env_id);
        } catch (error) {
            throw new NotFoundException({ message: 'Registro no encontrado', id: env_id });
        }
    }

    async findByType(env_type: string): Promise<TblEnvironmentType> {
        try {
            return await this.tblEnvironmentTypeRepository.findByType(env_type);
        } catch (error) {
            throw new NotFoundException({ message: userMsg.registroNoEncontrado });
        }
    }

    async update(tblEnvironmentType: TblEnvironmentType): Promise<TblEnvironmentType> {
        let existing: TblEnvironmentType;
        try {
            existing = await this.tblEnvironmentTypeRepository.findById(tblEnvironmentType.env_id);
        } catch {
            throw new NotFoundException({ message: 'Registro no encontrado', id: tblEnvironmentType.env_id });
        }

        const normalized = { ...tblEnvironmentType, env_detail: capitalizeFirstWord(tblEnvironmentType.env_detail) };
        const hasChanges =
            existing.env_type !== normalized.env_type ||
            existing.env_detail !== normalized.env_detail ||
            existing.env_responsible !== normalized.env_responsible;

        if (!hasChanges) {
            throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar', id: tblEnvironmentType.env_id });
        }

        const otraFilaMismoTipo = await this.tblEnvironmentTypeRepository.findByDuplicate(normalized.env_type);
        if (otraFilaMismoTipo && otraFilaMismoTipo.env_id !== existing.env_id) {
            throw new ConflictException({ message: userMsg.nombreTipoCatalogoEnUso, env_type: normalized.env_type });
        }

        const toSave: TblEnvironmentType = {
            env_id: existing.env_id,
            env_type: normalized.env_type,
            env_detail: normalized.env_detail,
            env_responsible: normalized.env_responsible,
            env_created_at: existing.env_created_at,
            env_updated_at: new Date(),
        };
        try {
            return await this.tblEnvironmentTypeRepository.update(toSave);
        } catch (err) {
            const isDuplicate =
                err instanceof QueryFailedError &&
                ((err as QueryFailedError & { code?: string; driverError?: { code?: string } }).code ===
                    'ER_DUP_ENTRY' ||
                    (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code ===
                        'ER_DUP_ENTRY' ||
                    (err as Error).message?.includes('Duplicate entry'));
            if (isDuplicate) {
                throw new ConflictException({ message: userMsg.nombreTipoCatalogoEnUso, env_type: normalized.env_type });
            }
            throw new InternalServerErrorException(userMsg.noActualizar);
        }
    }

    async delete(env_id: number): Promise<void> {
        try {
            await this.tblEnvironmentTypeRepository.findById(env_id);
        } catch (error) {
            throw new NotFoundException({ message: 'Registro no encontrado', id: env_id });
        }
        try {
            await this.tblEnvironmentTypeRepository.delete(env_id);
        } catch (error) {
            throw new InternalServerErrorException(userMsg.noEliminar);
        }
    }
}
