// Responsabilidad: fachada de aplicación que usará el controller.

import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { TblPortfolioType } from '@domain/entities/tblPortfolioType.entities';
import { CreateTblPortfolioTypeInput, TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/tblPortfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class TblPortfolioTypeService {
    constructor(
        @Inject(TBL_PORTFOLIO_TYPE_REPOSITORY)
        private readonly portfolioTypeRepository: TblPortfolioTypeRepository,
        @Inject(TBL_STATE_TYPE_REPOSITORY)
        private readonly stateTypeRepository: TblStateTypeRepository,
    ) {}

    async create(input: CreateTblPortfolioTypeInput): Promise<TblPortfolioType> {
        try {
            TblStateTypeId.create(input.porty_state_type_id);
        } catch {
            throw new BadRequestException('porty_state_type_id must be a positive integer');
        }
        try {
            await this.stateTypeRepository.findById(input.porty_state_type_id);
        } catch {
            throw new NotFoundException('No data found for the given state type id');
        }
        const duplicate = await this.portfolioTypeRepository.findByDuplicate(input.porty_type);
        if (duplicate) throw new ConflictException('Portfolio type already exists');

        const normalized = { ...input, porty_detail: capitalizeFirstWord(input.porty_detail) };
        try {
            return await this.portfolioTypeRepository.create(normalized);
        } catch {
            throw new InternalServerErrorException('Error creating portfolio type');
        }
    }

    async findAll(): Promise<TblPortfolioType[]> {
        try {
            return await this.portfolioTypeRepository.findAll();
        } catch {
            throw new InternalServerErrorException('Error getting all portfolio types');
        }
    }

    async findById(id: number): Promise<TblPortfolioType> {
        try {
            const portfolio = await this.portfolioTypeRepository.findById(id);
            const stateType = await this.stateTypeRepository.findById(portfolio.porty_state_type_id);
            return { ...portfolio, state_type_name: stateType.stty_type };
        } catch {
            throw new NotFoundException('No data found for the given id');
        }
    }

    async findByType(type: string): Promise<TblPortfolioType> {
        try {
            const portfolio = await this.portfolioTypeRepository.findByType(type);
            const stateType = await this.stateTypeRepository.findById(portfolio.porty_state_type_id);
            return { ...portfolio, state_type_name: stateType.stty_type };
        } catch {
            throw new NotFoundException('No data found for the given type');
        }
    }

    async update(input: TblPortfolioType): Promise<TblPortfolioType> {
        try {
            TblStateTypeId.create(input.porty_state_type_id);
        } catch {
            throw new BadRequestException('porty_state_type_id must be a positive integer');
        }
        let existing: TblPortfolioType;
        try {
            existing = await this.portfolioTypeRepository.findById(input.porty_id);
        } catch {
            throw new NotFoundException('No data found for the given id');
        }
        const normalized = { ...input, porty_detail: capitalizeFirstWord(input.porty_detail) };
        const hasChanges =
            existing.porty_type !== normalized.porty_type ||
            existing.porty_detail !== normalized.porty_detail ||
            existing.porty_state_type_id !== normalized.porty_state_type_id ||
            existing.porty_responsible !== normalized.porty_responsible;

        if (!hasChanges) throw new BadRequestException('No changes to update');

        try {
            return await this.portfolioTypeRepository.update(normalized);
        } catch {
            throw new InternalServerErrorException('Error updating portfolio type');
        }
    }

    async delete(id: number): Promise<void> {
        try {
            await this.portfolioTypeRepository.findById(id);
        } catch {
            throw new NotFoundException('No data found for the given id');
        }
        try {
            await this.portfolioTypeRepository.delete(id);
        } catch {
            throw new InternalServerErrorException('Error deleting portfolio type');
        }
    }
}
