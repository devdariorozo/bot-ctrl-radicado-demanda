// Responsabilidad: implementación concreta de TblStateTypeRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { CreateTblStateTypeInput, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblStateTypeEntity } from '../entities/tblStateType.entities';
import { DataSource, Like, Repository } from 'typeorm';
import { TblStateType } from '@domain/entities/tblStateType.entities';

@Injectable()
export class TblStateTypeRepositoryImpl implements TblStateTypeRepository {
    private readonly tblStateTypeRepository: Repository<TblStateTypeEntity>;

    constructor(@InjectDataSource() dataSource: DataSource) {
        this.tblStateTypeRepository = dataSource.getRepository(TblStateTypeEntity);
    }
    // Crear un nuevo tipo de estado
    async create(tblStateType: CreateTblStateTypeInput): Promise<TblStateType> {
        const now = new Date();
        const entity: Partial<TblStateTypeEntity> = {
            stty_type: tblStateType.stty_type,
            stty_detail: tblStateType.stty_detail,
            stty_created_at: tblStateType.stty_created_at ?? now,
            stty_updated_at: tblStateType.stty_updated_at ?? now,
            stty_responsible: tblStateType.stty_responsible,
        };
        const saved = await this.tblStateTypeRepository.save(entity as TblStateTypeEntity);
        return saved;
    }
    // Buscar duplicado por stty_type; devuelve null si no existe
    async findByDuplicate(stty_type: string): Promise<TblStateType | null> {
        const record = await this.tblStateTypeRepository.findOneBy({ stty_type });
        return record ?? null;
    }
    // Obtener todos los tipos de estado
    async findAll(): Promise<TblStateType[]> {
        return this.tblStateTypeRepository.find({ order: { stty_id: 'DESC' } });
    }
    // Obtener un tipo de estado por su stty_id
    async findById(stty_id: number): Promise<TblStateType> {
        const record = await this.tblStateTypeRepository.findOneBy({ stty_id });
        if (!record) {
            throw new Error('Tbl state type not found');
        }
        return record;
    }
    // Obtener un tipo de estado por su stty_type (búsqueda exacta y luego parcial con LIKE)
    async findByType(stty_type: string): Promise<TblStateType> {
        const normalized = (stty_type ?? '').trim();

        if (!normalized) {
            throw new Error('Tbl state type not found');
        }

        const exact = await this.tblStateTypeRepository.findOne({
            where: { stty_type: normalized },
        });
        if (exact) {
            return exact;
        }

        const partialMatches = await this.tblStateTypeRepository.find({
            where: { stty_type: Like(`%${normalized}%`) },
            order: { stty_id: 'ASC' },
        });

        if (!partialMatches.length) {
            throw new Error('Tbl state type not found');
        }

        return partialMatches[0];
    }
    // Actualizar un tipo de estado
    async update(tblStateType: TblStateType): Promise<TblStateType> {
        return this.tblStateTypeRepository.save(tblStateType);
    }
    // Eliminar un tipo de estado
    async delete(stty_id: number): Promise<void> {
        await this.tblStateTypeRepository.delete(stty_id);
    }
}