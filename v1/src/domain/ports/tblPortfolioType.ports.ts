// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { TblPortfolioType } from '@domain/entities/tblPortfolioType.entities';

export const TBL_PORTFOLIO_TYPE_REPOSITORY = Symbol('TBL_PORTFOLIO_TYPE_REPOSITORY');

export type CreateTblPortfolioTypeInput = Pick<TblPortfolioType, 'porty_type' | 'porty_detail' | 'porty_state_type_id' | 'porty_responsible'> & Partial<TblPortfolioType>;

export interface TblPortfolioTypeRepository {
    create(input: CreateTblPortfolioTypeInput): Promise<TblPortfolioType>;
    findByDuplicate(porty_type: string): Promise<TblPortfolioType | null>;
    findAll(): Promise<TblPortfolioType[]>;
    findById(id: number): Promise<TblPortfolioType>;
    findByType(type: string): Promise<TblPortfolioType>;
    update(input: TblPortfolioType): Promise<TblPortfolioType>;
    delete(id: number): Promise<void>;
}
