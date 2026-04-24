// Responsabilidad: fachada de aplicación que usará el controller.

import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { TblStateType } from "@domain/entities/tblStateType.entities";
import { CreateTblStateTypeInput, TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from "@domain/ports/tblStateType.ports";
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class TblStateTypeService {
    constructor(
        @Inject(TBL_STATE_TYPE_REPOSITORY)
        private readonly tblStateTypeRepository: TblStateTypeRepository,
    ) {}

    // Crear un nuevo tipo de estado
    async create(tblStateType: CreateTblStateTypeInput): Promise<TblStateType> {
        const duplicate = await this.tblStateTypeRepository.findByDuplicate(tblStateType.stty_type);

        if (duplicate) {
            throw new ConflictException('Tbl state type already exists');
        }

        const normalized = { ...tblStateType, stty_detail: capitalizeFirstWord(tblStateType.stty_detail) };
        try {
            return await this.tblStateTypeRepository.create(normalized);
        } catch (error) {
            throw new InternalServerErrorException('Error creating tbl state type');
        }
    }
    // Obtener todos los tipos de estado
    async findAll(): Promise<TblStateType[]> {
        try {
            return await this.tblStateTypeRepository.findAll();
        } catch (error) {
            throw new InternalServerErrorException('Error getting all tbl state types');
        }
    }
    // Obtener un tipo de estado por su stty_id
    async findById(stty_id: number): Promise<TblStateType> {
        try {
            return await this.tblStateTypeRepository.findById(stty_id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
    }
    // Obtener un tipo de estado por su stty_type
    async findByType(stty_type: string): Promise<TblStateType> {
        try {
            return await this.tblStateTypeRepository.findByType(stty_type);
        } catch (error) {
            throw new NotFoundException('No data found for the given type');
        }
    }
    // Actualizar un tipo de estado
    async update(tblStateType: TblStateType): Promise<TblStateType> {
        let existing: TblStateType;
        try {
            existing = await this.tblStateTypeRepository.findById(tblStateType.stty_id);
        } catch {
            throw new NotFoundException('No data found for the given id');
        }

        const normalized = { ...tblStateType, stty_detail: capitalizeFirstWord(tblStateType.stty_detail) };
        const hasChanges =
            existing.stty_type !== normalized.stty_type ||
            existing.stty_detail !== normalized.stty_detail ||
            existing.stty_responsible !== normalized.stty_responsible;

        if (!hasChanges) {
            throw new BadRequestException('No changes to update');
        }

        try {
            return await this.tblStateTypeRepository.update(normalized);
        } catch (error) {
            throw new InternalServerErrorException('Error updating tbl state type');
        }
    }
    // Eliminar un tipo de estado
    async delete(stty_id: number): Promise<void> {
        try {
            await this.tblStateTypeRepository.findById(stty_id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
        try {
            await this.tblStateTypeRepository.delete(stty_id);
        } catch (error) {
            throw new InternalServerErrorException('Error deleting tbl state type');
        }
    }
}