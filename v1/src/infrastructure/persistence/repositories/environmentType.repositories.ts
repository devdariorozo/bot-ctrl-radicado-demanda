// Responsabilidad: implementación concreta de EnvironmentTypeRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';

import { EnvironmentType } from '@domain/entities/environmentType.entities';
import {
    CreateEnvironmentTypeInput,
    EnvironmentTypeRepository,
} from '@domain/ports/environmentType.ports';
import { EnvironmentTypeEntity } from '../entities/environmentType.entities';

@Injectable()
export class EnvironmentTypeRepositoryImpl implements EnvironmentTypeRepository {
    private readonly environmentTypeRepository: Repository<EnvironmentTypeEntity>;

    constructor(@InjectDataSource() dataSource: DataSource) {
        this.environmentTypeRepository = dataSource.getRepository(EnvironmentTypeEntity);
    }
    // Crear un nuevo tipo de entorno
    async create(input: CreateEnvironmentTypeInput): Promise<EnvironmentType> {
        const now = new Date();
        const entity: Partial<EnvironmentTypeEntity> = {
            type: input.type,
            detail: input.detail,
            created_at: input.created_at ?? now,
            updated_at: input.updated_at ?? now,
            responsible: input.responsible,
        };
        const saved = await this.environmentTypeRepository.save(entity as EnvironmentTypeEntity);
        return saved;
    }
    // Buscar duplicado por type; devuelve null si no existe
    async findByDuplicate(type: string): Promise<EnvironmentType | null> {
        const environmentType = await this.environmentTypeRepository.findOneBy({ type });
        return environmentType ?? null;
    }
    // Obtener todos los tipos de entorno
    async findAll(): Promise<EnvironmentType[]> {
        return this.environmentTypeRepository.find();
    }
    // Obtener un tipo de entorno por su id
    async findById(id: number): Promise<EnvironmentType> {
        const environmentType = await this.environmentTypeRepository.findOneBy({ id });
        if (!environmentType) {
            throw new Error('Environment type not found');
        }
        return environmentType;
    }
    // Obtener un tipo de entorno por su type (búsqueda exacta y luego parcial con LIKE)
    async findByType(type: string): Promise<EnvironmentType> {
        const normalized = (type ?? '').trim();

        if (!normalized) {
            throw new Error('Environment type not found');
        }

        const exact = await this.environmentTypeRepository.findOne({
            where: { type: normalized },
        });
        if (exact) {
            return exact;
        }

        const partialMatches = await this.environmentTypeRepository.find({
            where: { type: Like(`%${normalized}%`) },
            order: { id: 'ASC' },
        });

        if (!partialMatches.length) {
            throw new Error('Environment type not found');
        }

        return partialMatches[0];
    }
    // Actualizar un tipo de entorno
    async update(environmentType: EnvironmentType): Promise<EnvironmentType> {
        return this.environmentTypeRepository.save(environmentType);
    }
    // Eliminar un tipo de entorno
    async delete(id: number): Promise<void> {
        await this.environmentTypeRepository.delete(id);
    }
}

