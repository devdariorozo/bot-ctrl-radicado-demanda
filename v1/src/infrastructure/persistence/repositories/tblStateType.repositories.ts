// Responsabilidad: implementación concreta de TblStateTypeRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { CreateTblStateTypeInput, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblStateTypeEntity } from '../entities/tblStateType.entities';
import { DataSource, Repository } from 'typeorm';
import { TblStateType } from '@domain/entities/tblStateType.entities';

@Injectable()
export class TblStateTypeRepositoryImpl implements TblStateTypeRepository {
    private readonly tblStateTypeRepository: Repository<TblStateTypeEntity>;

    constructor(@InjectDataSource() dataSource: DataSource) {
        this.tblStateTypeRepository = dataSource.getRepository(TblStateTypeEntity);
    }

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
        return {
            stty_id: saved.stty_id,
            stty_type: saved.stty_type,
            stty_detail: saved.stty_detail,
            stty_created_at: saved.stty_created_at,
            stty_updated_at: saved.stty_updated_at,
            stty_responsible: saved.stty_responsible,
        };
    }

    async findByDuplicate(stty_type: string): Promise<TblStateType | null> {
        const record = await this.tblStateTypeRepository.findOneBy({ stty_type });
        return record ?? null;
    }

    async findAll(): Promise<TblStateType[]> {
        return this.tblStateTypeRepository.find({ order: { stty_id: 'DESC' } });
    }

    async findAllActive(): Promise<TblStateType[]> {
        return this.tblStateTypeRepository
            .createQueryBuilder('s')
            .where('LOWER(s.stty_type) NOT LIKE :pattern', { pattern: '%inactiv%' })
            .orderBy('s.stty_id', 'DESC')
            .getMany();
    }

    async findById(stty_id: number): Promise<TblStateType> {
        const record = await this.tblStateTypeRepository.findOneBy({ stty_id });
        if (!record) {
            throw new Error('Tbl state type not found');
        }
        return record;
    }

    async update(tblStateType: TblStateType): Promise<TblStateType> {
        await this.tblStateTypeRepository.update(
            { stty_id: tblStateType.stty_id },
            {
                stty_type: tblStateType.stty_type,
                stty_detail: tblStateType.stty_detail,
                stty_responsible: tblStateType.stty_responsible,
                stty_updated_at: tblStateType.stty_updated_at,
            },
        );
        return this.findById(tblStateType.stty_id);
    }

    async delete(stty_id: number): Promise<void> {
        await this.tblStateTypeRepository.delete(stty_id);
    }
}
