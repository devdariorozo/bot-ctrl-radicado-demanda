// Responsabilidad: fachada de aplicación que usará el controller.

import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { PortfolioType } from "@domain/entities/portfolioType.entities";
import { CreatePortfolioTypeInput, PORTFOLIO_TYPE_REPOSITORY, PortfolioTypeRepository } from "@domain/ports/portfolioType.ports";
import { STATE_TYPE_REPOSITORY, StateTypeRepository } from '@domain/ports/stateType.ports';
import { StateTypeId } from '@domain/value-objects/stateType.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class PortfolioTypeService {
    constructor(
        @Inject(PORTFOLIO_TYPE_REPOSITORY)
        private readonly portfolioTypeRepository: PortfolioTypeRepository,
        @Inject(STATE_TYPE_REPOSITORY)
        private readonly stateTypeRepository: StateTypeRepository,
    ) {}

    // Crear un nuevo tipo de cartera
    async create(portfolioType: CreatePortfolioTypeInput): Promise<PortfolioType> {
        // 1) garantizar que state_type_id sea número entero > 0
        try {
            StateTypeId.create(portfolioType.state_type_id);
        } catch {
            throw new BadRequestException('state_type_id must be a positive integer');
        }
        // 2) validar que exista en BD
        try {
            await this.stateTypeRepository.findById(portfolioType.state_type_id);
        } catch {
            throw new NotFoundException('No data found for the given state type id');
        }
        
        // Verificar si el tipo de cartera ya existe
        const duplicate = await this.portfolioTypeRepository.findByDuplicate(portfolioType.type);
    
        if (duplicate) {
            throw new ConflictException('Portfolio type already exists');
        }
    
        const normalized = { ...portfolioType, detail: capitalizeFirstWord(portfolioType.detail) };
        try {
            return await this.portfolioTypeRepository.create(normalized);
        } catch (error) {
            throw new InternalServerErrorException('Error creating portfolio type');
        }
    }
    // Obtener todos los tipos de cartera
    async findAll(): Promise<PortfolioType[]> {
        try {
            return await this.portfolioTypeRepository.findAll();
        } catch (error) {
            throw new InternalServerErrorException('Error getting all portfolio types');
        }
    }
    // Obtener un tipo de cartera por su id
    async findById(id: number): Promise<PortfolioType> {
        try {
            const portfolio = await this.portfolioTypeRepository.findById(id);
            const stateType = await this.stateTypeRepository.findById(portfolio.state_type_id);
            return {
                id: portfolio.id,
                type: portfolio.type,
                state_type_id: portfolio.state_type_id,
                state_type_name: stateType.type,
                detail: portfolio.detail,
                created_at: portfolio.created_at,
                updated_at: portfolio.updated_at,
                responsible: portfolio.responsible,
            };
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
    }
    // Obtener un tipo de cartera por su type
    async findByType(type: string): Promise<PortfolioType> {
        try {
            const portfolio = await this.portfolioTypeRepository.findByType(type);
            const stateType = await this.stateTypeRepository.findById(portfolio.state_type_id);
            return {
                id: portfolio.id,
                type: portfolio.type,
                state_type_id: portfolio.state_type_id,
                state_type_name: stateType.type,
                detail: portfolio.detail,
                created_at: portfolio.created_at,
                updated_at: portfolio.updated_at,
                responsible: portfolio.responsible,
            };
        } catch (error) {
            throw new NotFoundException('No data found for the given type');
        }
    }
    // Actualizar un tipo de cartera
    async update(portfolioType: PortfolioType): Promise<PortfolioType> {
        // Garantizar que state_type_id sea número entero > 0
        try {
            StateTypeId.create(portfolioType.state_type_id);
        } catch {
            throw new BadRequestException('state_type_id must be a positive integer');
        }
        let existing: PortfolioType;
        try {
            existing = await this.portfolioTypeRepository.findById(portfolioType.id);
        } catch {
            throw new NotFoundException('No data found for the given id');
        }
        const normalized = { ...portfolioType, detail: capitalizeFirstWord(portfolioType.detail) };
        const hasChanges =
        existing.type !== normalized.type ||
        existing.detail !== normalized.detail ||
        existing.state_type_id !== normalized.state_type_id ||
        existing.responsible !== normalized.responsible;

        if (!hasChanges) {
        throw new BadRequestException('No changes to update');
        }

        try {
            return await this.portfolioTypeRepository.update(normalized); // solo se ejecuta cuando SÍ hay cambios 
        } catch (error) {
            throw new InternalServerErrorException('Error updating portfolio type');
        }
    }
    // Eliminar un tipo de cartera
    async delete(id: number): Promise<void> {
        try {
            await this.portfolioTypeRepository.findById(id);
        } catch (error) {
            throw new NotFoundException('No data found for the given id');
        }
        try {
            await this.portfolioTypeRepository.delete(id);
        } catch (error) {
            throw new InternalServerErrorException('Error deleting portfolio type');
        }
    }
}