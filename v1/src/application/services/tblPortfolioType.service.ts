// Responsabilidad: fachada de aplicación que usará el controller.

import {
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { TblPortfolioType } from '@domain/entities/tblPortfolioType.entities';
import { CreateTblPortfolioTypeInput, TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/tblPortfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';
import { QueryFailedError } from 'typeorm';

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
            throw new UnprocessableEntityException(userMsg.portyStateIdEntero);
        }
        try {
            await this.stateTypeRepository.findById(input.porty_state_type_id);
        } catch {
            throw new NotFoundException({ message: 'Registro no encontrado' });
        }
        const duplicate = await this.portfolioTypeRepository.findByDuplicate(input.porty_type);
        if (duplicate) {
            throw new ConflictException({ message: 'El registro ya existe', porty_type: input.porty_type });
        }

        const normalized = { ...input, porty_detail: capitalizeFirstWord(input.porty_detail) };
        try {
            return await this.portfolioTypeRepository.create(normalized);
        } catch {
            throw new InternalServerErrorException(userMsg.noCrear);
        }
    }

    async findAll(): Promise<TblPortfolioType[]> {
        try {
            return await this.portfolioTypeRepository.findAll();
        } catch {
            throw new InternalServerErrorException(userMsg.noListar);
        }
    }

    async findAllActive(): Promise<TblPortfolioType[]> {
        try {
            return await this.portfolioTypeRepository.findAllActive();
        } catch {
            throw new InternalServerErrorException(userMsg.noListar);
        }
    }

    async findById(id: number): Promise<TblPortfolioType> {
        let portfolio: TblPortfolioType;
        try {
            portfolio = await this.portfolioTypeRepository.findById(id);
        } catch {
            throw new NotFoundException({ message: 'Registro no encontrado', id });
        }
        try {
            const stateType = await this.stateTypeRepository.findById(portfolio.porty_state_type_id);
            return { ...portfolio, state_type_name: stateType.stty_type };
        } catch {
            throw new InternalServerErrorException(userMsg.noCargarRelacion);
        }
    }

    async findByType(type: string): Promise<TblPortfolioType> {
        try {
            const portfolio = await this.portfolioTypeRepository.findByType(type);
            const stateType = await this.stateTypeRepository.findById(portfolio.porty_state_type_id);
            return { ...portfolio, state_type_name: stateType.stty_type };
        } catch {
            throw new NotFoundException({ message: userMsg.registroNoEncontrado });
        }
    }

    async update(input: TblPortfolioType): Promise<TblPortfolioType> {
        try {
            TblStateTypeId.create(input.porty_state_type_id);
        } catch {
            throw new UnprocessableEntityException(userMsg.portyStateIdEntero);
        }
        let existing: TblPortfolioType;
        try {
            existing = await this.portfolioTypeRepository.findById(input.porty_id);
        } catch {
            throw new NotFoundException({ message: 'Registro no encontrado', id: input.porty_id });
        }
        try {
            await this.stateTypeRepository.findById(input.porty_state_type_id);
        } catch {
            throw new NotFoundException({ message: 'Registro no encontrado' });
        }

        const normalized = { ...input, porty_detail: capitalizeFirstWord(input.porty_detail) };
        const hasChanges =
            existing.porty_type !== normalized.porty_type ||
            existing.porty_detail !== normalized.porty_detail ||
            existing.porty_state_type_id !== normalized.porty_state_type_id ||
            existing.porty_responsible !== normalized.porty_responsible;

        if (!hasChanges) {
            throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar', id: input.porty_id });
        }

        const otraFilaMismoTipo = await this.portfolioTypeRepository.findByDuplicate(normalized.porty_type);
        if (otraFilaMismoTipo && otraFilaMismoTipo.porty_id !== existing.porty_id) {
            throw new ConflictException({ message: userMsg.nombreTipoCatalogoEnUso, porty_type: normalized.porty_type });
        }

        const toSave: TblPortfolioType = {
            porty_id: existing.porty_id,
            porty_type: normalized.porty_type,
            porty_detail: normalized.porty_detail,
            porty_state_type_id: normalized.porty_state_type_id,
            porty_responsible: normalized.porty_responsible,
            porty_created_at: existing.porty_created_at,
            porty_updated_at: new Date(),
        };
        try {
            return await this.portfolioTypeRepository.update(toSave);
        } catch (err) {
            const isDuplicate =
                err instanceof QueryFailedError &&
                ((err as QueryFailedError & { code?: string; driverError?: { code?: string } }).code ===
                    'ER_DUP_ENTRY' ||
                    (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code ===
                        'ER_DUP_ENTRY' ||
                    (err as Error).message?.includes('Duplicate entry'));
            if (isDuplicate) {
                throw new ConflictException({ message: userMsg.nombreTipoCatalogoEnUso, porty_type: normalized.porty_type });
            }
            throw new InternalServerErrorException(userMsg.noActualizar);
        }
    }

    async delete(id: number): Promise<void> {
        try {
            await this.portfolioTypeRepository.findById(id);
        } catch {
            throw new NotFoundException({ message: 'Registro no encontrado', id });
        }
        try {
            await this.portfolioTypeRepository.delete(id);
        } catch {
            throw new InternalServerErrorException(userMsg.noEliminar);
        }
    }
}
