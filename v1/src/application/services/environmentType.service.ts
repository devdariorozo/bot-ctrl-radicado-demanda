// Responsabilidad: fachada de aplicación que usará el controller.

import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { EnvironmentType } from "@domain/entities/environmentType.entities";
import { CreateEnvironmentTypeInput, ENVIRONMENT_TYPE_REPOSITORY, EnvironmentTypeRepository } from "@domain/ports/environmentType.ports";
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class EnvironmentTypeService {
    constructor(
        @Inject(ENVIRONMENT_TYPE_REPOSITORY)
        private readonly environmentTypeRepository: EnvironmentTypeRepository,
    ) {}

    // Crear un nuevo tipo de entorno
    async create(environmentType: CreateEnvironmentTypeInput): Promise<EnvironmentType> {
        // Verificar si el tipo de entorno ya existe
        const duplicate = await this.environmentTypeRepository.findByDuplicate(environmentType.type);
    
        if (duplicate) {
        throw new ConflictException('Environment type already exists');
        }
    
        const normalized = { ...environmentType, detail: capitalizeFirstWord(environmentType.detail) };
        try {
            return await this.environmentTypeRepository.create(normalized);
        } catch (error) {
            throw new InternalServerErrorException('Error creating environment type');
        }
    }
    // Obtener todos los tipos de entorno
    async findAll(): Promise<EnvironmentType[]> {
        try {
            return await this.environmentTypeRepository.findAll();
        } catch (error) {
            throw new InternalServerErrorException('Error getting all environment types');
        }
    }
    // Obtener un tipo de entorno por su id
    async findById(id: number): Promise<EnvironmentType> {
        try {
            return await this.environmentTypeRepository.findById(id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
    }
    // Obtener un tipo de entorno por su type
    async findByType(type: string): Promise<EnvironmentType> {
        try {
            return await this.environmentTypeRepository.findByType(type);
        } catch (error) {
            throw new NotFoundException('No data found for the given type');
        }
    }
    // Actualizar un tipo de entorno
    async update(environmentType: EnvironmentType): Promise<EnvironmentType> {
        let existing: EnvironmentType;
        try {
            existing = await this.environmentTypeRepository.findById(environmentType.id);
        } catch {
            throw new NotFoundException('No data found for the given id');
        }

        const normalized = { ...environmentType, detail: capitalizeFirstWord(environmentType.detail) };
        const hasChanges =
        existing.type !== normalized.type ||
        existing.detail !== normalized.detail ||
        existing.responsible !== normalized.responsible;

        if (!hasChanges) {
        throw new BadRequestException('No changes to update');
        }

        try {
            return await this.environmentTypeRepository.update(normalized); // solo se ejecuta cuando SÍ hay cambios 
        } catch (error) {
            throw new InternalServerErrorException('Error updating environment type');
        }
    }
    // Eliminar un tipo de entorno
    async delete(id: number): Promise<void> {
        try {
            await this.environmentTypeRepository.findById(id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
        try {
            await this.environmentTypeRepository.delete(id);
        } catch (error) {
            throw new InternalServerErrorException('Error deleting environment type');
        }
    }
}

