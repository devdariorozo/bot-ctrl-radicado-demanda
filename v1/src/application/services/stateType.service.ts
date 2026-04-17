// Responsabilidad: fachada de aplicación que usará el controller.

import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { StateType } from "@domain/entities/stateType.entities";
import { CreateStateTypeInput, STATE_TYPE_REPOSITORY, StateTypeRepository } from "@domain/ports/stateType.ports";
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class StateTypeService {
    constructor(
        @Inject(STATE_TYPE_REPOSITORY)
        private readonly stateTypeRepository: StateTypeRepository,
    ) {}

    // Crear un nuevo tipo de estado
    async create(stateType: CreateStateTypeInput): Promise<StateType> {
        // Verificar si el tipo de estado ya existe
        const duplicate = await this.stateTypeRepository.findByDuplicate(stateType.type);
    
        if (duplicate) {
        throw new ConflictException('State type already exists');
        }
    
        const normalized = { ...stateType, detail: capitalizeFirstWord(stateType.detail) };
        try {
            return await this.stateTypeRepository.create(normalized);
        } catch (error) {
            throw new InternalServerErrorException('Error creating state type');
        }
    }
    // Obtener todos los tipos de estado
    async findAll(): Promise<StateType[]> {
        try {
            return await this.stateTypeRepository.findAll();
        } catch (error) {
            throw new InternalServerErrorException('Error getting all state types');
        }
    }
    // Obtener un tipo de estado por su id
    async findById(id: number): Promise<StateType> {
        try {
            return await this.stateTypeRepository.findById(id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
    }
    // Obtener un tipo de estado por su type
    async findByType(type: string): Promise<StateType> {
        try {
            return await this.stateTypeRepository.findByType(type);
        } catch (error) {
            throw new NotFoundException('No data found for the given type');
        }
    }
    // Actualizar un tipo de estado
    async update(stateType: StateType): Promise<StateType> {
        let existing: StateType;
        try {
            existing = await this.stateTypeRepository.findById(stateType.id);
        } catch {
            throw new NotFoundException('No data found for the given id');
        }

        const normalized = { ...stateType, detail: capitalizeFirstWord(stateType.detail) };
        const hasChanges =
        existing.type !== normalized.type ||
        existing.detail !== normalized.detail ||
        existing.responsible !== normalized.responsible;

        if (!hasChanges) {
        throw new BadRequestException('No changes to update');
        }

        try {
            return await this.stateTypeRepository.update(normalized); // solo se ejecuta cuando SÍ hay cambios 
        } catch (error) {
            throw new InternalServerErrorException('Error updating state type');
        }
    }
    // Eliminar un tipo de estado
    async delete(id: number): Promise<void> {
        try {
            await this.stateTypeRepository.findById(id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
        try {
            await this.stateTypeRepository.delete(id);
        } catch (error) {
            throw new InternalServerErrorException('Error deleting state type');
        }
    }
}