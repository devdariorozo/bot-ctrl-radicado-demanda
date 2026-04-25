// Responsabilidad: implementación concreta de TblEnvironmentTypeRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';

import { TblEnvironmentType } from '@domain/entities/tblEnvironmentType.entities';
import {
    CreateTblEnvironmentTypeInput,
    TblEnvironmentTypeRepository,
} from '@domain/ports/tblEnvironmentType.ports';
import { TblEnvironmentTypeEntity } from '../entities/tblEnvironmentType.entities';

@Injectable()
export class TblEnvironmentTypeRepositoryImpl implements TblEnvironmentTypeRepository {
    private readonly tblEnvironmentTypeRepository: Repository<TblEnvironmentTypeEntity>;

    constructor(@InjectDataSource() dataSource: DataSource) {
        this.tblEnvironmentTypeRepository = dataSource.getRepository(TblEnvironmentTypeEntity);
    }
    // Crear un nuevo tipo de entorno
    async create(input: CreateTblEnvironmentTypeInput): Promise<TblEnvironmentType> {
        const now = new Date();
        const entity: Partial<TblEnvironmentTypeEntity> = {
            env_type: input.env_type,
            env_detail: input.env_detail,
            env_created_at: input.env_created_at ?? now,
            env_updated_at: input.env_updated_at ?? now,
            env_responsible: input.env_responsible,
        };
        const saved = await this.tblEnvironmentTypeRepository.save(entity as TblEnvironmentTypeEntity);
        return {
            env_id: saved.env_id,
            env_type: saved.env_type,
            env_detail: saved.env_detail,
            env_created_at: saved.env_created_at,
            env_updated_at: saved.env_updated_at,
            env_responsible: saved.env_responsible,
        };
    }
    // Buscar duplicado por env_type; devuelve null si no existe
    async findByDuplicate(env_type: string): Promise<TblEnvironmentType | null> {
        const record = await this.tblEnvironmentTypeRepository.findOneBy({ env_type });
        return record ?? null;
    }
    // Obtener todos los tipos de entorno
    async findAll(): Promise<TblEnvironmentType[]> {
        return this.tblEnvironmentTypeRepository.find({ order: { env_id: 'DESC' } });
    }
    // Obtener un tipo de entorno por su env_id
    async findById(env_id: number): Promise<TblEnvironmentType> {
        const record = await this.tblEnvironmentTypeRepository.findOneBy({ env_id });
        if (!record) {
            throw new Error('Tbl environment type not found');
        }
        return record;
    }
    // Obtener un tipo de entorno por su env_type (búsqueda exacta y luego parcial con LIKE)
    async findByType(env_type: string): Promise<TblEnvironmentType> {
        const normalized = (env_type ?? '').trim();

        if (!normalized) {
            throw new Error('Tbl environment type not found');
        }

        const exact = await this.tblEnvironmentTypeRepository.findOne({
            where: { env_type: normalized },
        });
        if (exact) {
            return exact;
        }

        const partialMatches = await this.tblEnvironmentTypeRepository.find({
            where: { env_type: Like(`%${normalized}%`) },
            order: { env_id: 'ASC' },
        });

        if (!partialMatches.length) {
            throw new Error('Tbl environment type not found');
        }

        return partialMatches[0];
    }
    // UPDATE parcial: no usa save() con objeto incompleto (evita 500 con columnas de auditoría).
    async update(tblEnvironmentType: TblEnvironmentType): Promise<TblEnvironmentType> {
        // No validar r.affected: en MySQL puede ser 0 con UPDATE válido (sin cambio efectivo) o
        // undefined según el driver; findById confirma el estado.
        await this.tblEnvironmentTypeRepository.update(
            { env_id: tblEnvironmentType.env_id },
            {
                env_type: tblEnvironmentType.env_type,
                env_detail: tblEnvironmentType.env_detail,
                env_responsible: tblEnvironmentType.env_responsible,
                env_updated_at: tblEnvironmentType.env_updated_at,
            },
        );
        return this.findById(tblEnvironmentType.env_id);
    }
    // Eliminar un tipo de entorno
    async delete(env_id: number): Promise<void> {
        await this.tblEnvironmentTypeRepository.delete(env_id);
    }
}

