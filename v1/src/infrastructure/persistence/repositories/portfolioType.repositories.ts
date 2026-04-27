// Responsabilidad: implementación concreta de TblPortfolioTypeRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { CreateTblPortfolioTypeInput, TblPortfolioTypeRepository } from '@domain/ports/portfolioType.ports';
import { TblPortfolioTypeEntity } from '../entities/portfolioType.entities';
import { TblStateTypeEntity } from '../entities/stateType.entities';
import { DataSource, Like, Repository } from 'typeorm';
import { TblPortfolioType } from '@domain/entities/portfolioType.entities';

@Injectable()
export class TblPortfolioTypeRepositoryImpl implements TblPortfolioTypeRepository {
    private readonly repo: Repository<TblPortfolioTypeEntity>;

    constructor(@InjectDataSource() dataSource: DataSource) {
        this.repo = dataSource.getRepository(TblPortfolioTypeEntity);
    }

    async create(input: CreateTblPortfolioTypeInput): Promise<TblPortfolioType> {
        const now = new Date();
        const entity: Partial<TblPortfolioTypeEntity> = {
            ...input,
            porty_created_at: input.porty_created_at ?? now,
            porty_updated_at: input.porty_updated_at ?? now,
        };
        return this.repo.save(entity as TblPortfolioTypeEntity);
    }

    async findByDuplicate(porty_type: string): Promise<TblPortfolioType | null> {
        const found = await this.repo.findOneBy({ porty_type });
        return found ?? null;
    }

    async findAll(): Promise<TblPortfolioType[]> {
        const raw = await this.repo.createQueryBuilder('pt')
            .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = pt.porty_state_type_id')
            .select([
                'pt.porty_id',
                'pt.porty_type',
                'pt.porty_detail',
                'pt.porty_state_type_id',
                'pt.porty_created_at',
                'pt.porty_updated_at',
                'pt.porty_responsible',
            ])
            .addSelect('st.stty_type', 'state_type_name')
            .orderBy('pt.porty_id', 'DESC')
            .getRawMany();
        return raw.map((row: Record<string, unknown>) => ({
            porty_id: row.pt_porty_id as number,
            porty_type: row.pt_porty_type as string,
            porty_detail: row.pt_porty_detail as string,
            porty_state_type_id: row.pt_porty_state_type_id as number,
            state_type_name: (row.state_type_name as string) ?? '',
            porty_created_at: row.pt_porty_created_at as Date,
            porty_updated_at: row.pt_porty_updated_at as Date,
            porty_responsible: row.pt_porty_responsible as string,
        }));
    }

    async findAllActive(): Promise<TblPortfolioType[]> {
        const raw = await this.repo
            .createQueryBuilder('pt')
            .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = pt.porty_state_type_id')
            .where('LOWER(COALESCE(st.stty_type, :empty)) NOT LIKE :pattern', {
                pattern: '%inactiv%',
                empty: '',
            })
            .select([
                'pt.porty_id',
                'pt.porty_type',
                'pt.porty_detail',
                'pt.porty_state_type_id',
                'pt.porty_created_at',
                'pt.porty_updated_at',
                'pt.porty_responsible',
            ])
            .addSelect('st.stty_type', 'state_type_name')
            .orderBy('pt.porty_id', 'DESC')
            .getRawMany();
        return raw.map((row: Record<string, unknown>) => ({
            porty_id: row.pt_porty_id as number,
            porty_type: row.pt_porty_type as string,
            porty_detail: row.pt_porty_detail as string,
            porty_state_type_id: row.pt_porty_state_type_id as number,
            state_type_name: (row.state_type_name as string) ?? '',
            porty_created_at: row.pt_porty_created_at as Date,
            porty_updated_at: row.pt_porty_updated_at as Date,
            porty_responsible: row.pt_porty_responsible as string,
        }));
    }

    async findById(id: number): Promise<TblPortfolioType> {
        const found = await this.repo.findOneBy({ porty_id: id });
        if (!found) {
            throw new Error('Portfolio type not found');
        }
        return found;
    }

    async findByType(type: string): Promise<TblPortfolioType> {
        const normalized = (type ?? '').trim();
        if (!normalized) throw new Error('Portfolio type not found');

        const exact = await this.repo.findOne({ where: { porty_type: normalized } });
        if (exact) return exact;

        const partialMatches = await this.repo.find({
            where: { porty_type: Like(`%${normalized}%`) },
            order: { porty_id: 'ASC' },
        });
        if (!partialMatches.length) throw new Error('Portfolio type not found');
        return partialMatches[0];
    }

    async update(input: TblPortfolioType): Promise<TblPortfolioType> {
        await this.repo.update(
            { porty_id: input.porty_id },
            {
                porty_type: input.porty_type,
                porty_detail: input.porty_detail,
                porty_state_type_id: input.porty_state_type_id,
                porty_responsible: input.porty_responsible,
                porty_updated_at: input.porty_updated_at,
            },
        );
        return this.findById(input.porty_id);
    }

    async delete(id: number): Promise<void> {
        await this.repo.delete(id);
    }
}
