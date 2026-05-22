// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { TblStateType } from "@domain/entities/stateType.entities";

export const TBL_STATE_TYPE_REPOSITORY = Symbol('TBL_STATE_TYPE_REPOSITORY');

export type CreateTblStateTypeInput = Pick<TblStateType, 'stty_type' | 'stty_detail' | 'stty_responsible'> & Partial<TblStateType>;

export interface TblStateTypeRepository {
    create(tblStateType: CreateTblStateTypeInput): Promise<TblStateType>;
    findByDuplicate(stty_type: string): Promise<TblStateType | null>;
    findAll(): Promise<TblStateType[]>;
    findAllActive(): Promise<TblStateType[]>;
    findById(stty_id: number): Promise<TblStateType>;
    update(tblStateType: TblStateType): Promise<TblStateType>;
    delete(stty_id: number): Promise<void>;
}
