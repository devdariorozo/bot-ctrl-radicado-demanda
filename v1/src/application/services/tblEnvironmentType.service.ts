// Responsabilidad: fachada de aplicación que usará el controller.

import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { TblEnvironmentType } from "@domain/entities/tblEnvironmentType.entities";
import { CreateTblEnvironmentTypeInput, TBL_ENVIRONMENT_TYPE_REPOSITORY, TblEnvironmentTypeRepository } from "@domain/ports/tblEnvironmentType.ports";
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class TblEnvironmentTypeService {
    constructor(
        @Inject(TBL_ENVIRONMENT_TYPE_REPOSITORY)
        private readonly tblEnvironmentTypeRepository: TblEnvironmentTypeRepository,
    ) {}

    // Crear un nuevo tipo de entorno
    async create(tblEnvironmentType: CreateTblEnvironmentTypeInput): Promise<TblEnvironmentType> {
        const duplicate = await this.tblEnvironmentTypeRepository.findByDuplicate(tblEnvironmentType.env_type);

        if (duplicate) {
            throw new ConflictException('Tbl environment type already exists');
        }

        const normalized = { ...tblEnvironmentType, env_detail: capitalizeFirstWord(tblEnvironmentType.env_detail) };
        try {
            return await this.tblEnvironmentTypeRepository.create(normalized);
        } catch (error) {
            throw new InternalServerErrorException('Error creating tbl environment type');
        }
    }
    // Obtener todos los tipos de entorno
    async findAll(): Promise<TblEnvironmentType[]> {
        try {
            return await this.tblEnvironmentTypeRepository.findAll();
        } catch (error) {
            throw new InternalServerErrorException('Error getting all tbl environment types');
        }
    }
    // Obtener un tipo de entorno por su env_id
    async findById(env_id: number): Promise<TblEnvironmentType> {
        try {
            return await this.tblEnvironmentTypeRepository.findById(env_id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
    }
    // Obtener un tipo de entorno por su env_type
    async findByType(env_type: string): Promise<TblEnvironmentType> {
        try {
            return await this.tblEnvironmentTypeRepository.findByType(env_type);
        } catch (error) {
            throw new NotFoundException('No data found for the given type');
        }
    }
    // Actualizar un tipo de entorno
    async update(tblEnvironmentType: TblEnvironmentType): Promise<TblEnvironmentType> {
        let existing: TblEnvironmentType;
        try {
            existing = await this.tblEnvironmentTypeRepository.findById(tblEnvironmentType.env_id);
        } catch {
            throw new NotFoundException('No data found for the given id');
        }

        const normalized = { ...tblEnvironmentType, env_detail: capitalizeFirstWord(tblEnvironmentType.env_detail) };
        const hasChanges =
            existing.env_type !== normalized.env_type ||
            existing.env_detail !== normalized.env_detail ||
            existing.env_responsible !== normalized.env_responsible;

        if (!hasChanges) {
            throw new BadRequestException('No changes to update');
        }

        try {
            return await this.tblEnvironmentTypeRepository.update(normalized);
        } catch (error) {
            throw new InternalServerErrorException('Error updating tbl environment type');
        }
    }
    // Eliminar un tipo de entorno
    async delete(env_id: number): Promise<void> {
        try {
            await this.tblEnvironmentTypeRepository.findById(env_id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
        try {
            await this.tblEnvironmentTypeRepository.delete(env_id);
        } catch (error) {
            throw new InternalServerErrorException('Error deleting tbl environment type');
        }
    }
}

