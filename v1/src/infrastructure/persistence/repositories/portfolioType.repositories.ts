// Responsabilidad: implementación concreta de PortfolioTypeRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { CreatePortfolioTypeInput, PortfolioTypeRepository } from '@domain/ports/portfolioType.ports';
import { PortfolioTypeEntity } from '../entities/portfolioType.entities';
import { StateTypeEntity } from '../entities/stateType.entities';
import { DataSource, Like, Repository } from 'typeorm';
import { PortfolioType } from '@domain/entities/portfolioType.entities';

@Injectable()
export class PortfolioTypeRepositoryImpl implements PortfolioTypeRepository {
    private readonly PortfolioTypeRepository: Repository<PortfolioTypeEntity>;

    constructor(@InjectDataSource() dataSource: DataSource) {
        this.PortfolioTypeRepository = dataSource.getRepository(PortfolioTypeEntity);
    }
    // Crear un nuevo tipo de cartera
    async create(PortfolioType: CreatePortfolioTypeInput): Promise<PortfolioType> {
        const now = new Date();
        const entity: Partial<PortfolioTypeEntity> = {
            ...PortfolioType,
            created_at: PortfolioType.created_at ?? now,
            updated_at: PortfolioType.updated_at ?? now,
        };
        const saved = await this.PortfolioTypeRepository.save(entity as PortfolioTypeEntity);
        return saved;
    }
    // Buscar duplicado por type; devuelve null si no existe
    async findByDuplicate(type: string): Promise<PortfolioType | null> {
        const PortfolioType = await this.PortfolioTypeRepository.findOneBy({ type });
        return PortfolioType ?? null;
    }
    // Obtener todos los tipos de cartera
    async findAll(): Promise<PortfolioType[]> {
        const raw = await this.PortfolioTypeRepository.createQueryBuilder('pt')
            .leftJoin(StateTypeEntity, 'st', 'st.id = pt.state_type_id')
            .select([
                'pt.id',
                'pt.type',
                'pt.detail',
                'pt.state_type_id',
                'pt.created_at',
                'pt.updated_at',
                'pt.responsible',
            ])
            .addSelect('st.type', 'state_type_name')
            .orderBy('pt.id', 'DESC')
            .getRawMany();
        return raw.map((row: Record<string, unknown>) => ({
            id: row.pt_id,
            type: row.pt_type,
            state_type_id: row.pt_state_type_id,
            state_type_name: row.state_type_name ?? '',
            detail: row.pt_detail,
            created_at: row.pt_created_at,
            updated_at: row.pt_updated_at,
            responsible: row.pt_responsible,
        })) as PortfolioType[];
    }
    // Obtener un tipo de cartera por su id
    async findById(id: number): Promise<PortfolioType> {
        const PortfolioType = await this.PortfolioTypeRepository.findOneBy({ id });
        if (!PortfolioType) {
            throw new Error('Portfolio type not found');
        }
        return PortfolioType;
    }
    // Obtener un tipo de cartera por su type (búsqueda exacta y luego parcial con LIKE)
    async findByType(type: string): Promise<PortfolioType> {
        const normalized = (type ?? '').trim();

        if (!normalized) {
            throw new Error('Portfolio type not found');
        }

        const exact = await this.PortfolioTypeRepository.findOne({
            where: { type: normalized },
        });
        if (exact) {
            return exact;
        }

        const partialMatches = await this.PortfolioTypeRepository.find({
            where: { type: Like(`%${normalized}%`) },
            order: { id: 'ASC' },
        });

        if (!partialMatches.length) {
            throw new Error('Portfolio type not found');
        }

        return partialMatches[0];
    }
    // Actualizar un tipo de cartera
    async update(PortfolioType: PortfolioType): Promise<PortfolioType> {
        return this.PortfolioTypeRepository.save(PortfolioType);
    }
    // Eliminar un tipo de cartera
    async delete(id: number): Promise<void> {
        await this.PortfolioTypeRepository.delete(id);
    }
}