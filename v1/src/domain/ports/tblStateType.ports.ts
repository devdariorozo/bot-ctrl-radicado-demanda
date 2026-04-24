// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { TblStateType } from "@domain/entities/tblStateType.entities";

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const TBL_STATE_TYPE_REPOSITORY = Symbol('TBL_STATE_TYPE_REPOSITORY');

/** Datos mínimos para crear un tipo de estado (stty_id y fechas son opcionales). */
export type CreateTblStateTypeInput = Pick<TblStateType, 'stty_type' | 'stty_detail' | 'stty_responsible'> & Partial<TblStateType>;

export interface TblStateTypeRepository {
    // Crear un nuevo tipo de estado
    create(tblStateType: CreateTblStateTypeInput): Promise<TblStateType>;
    // Buscar si el tipo de estado ya existe
    findByDuplicate(stty_type: string): Promise<TblStateType | null>;
    // Obtener todos los tipos de estado
    findAll(): Promise<TblStateType[]>;
    // Obtener un tipo de estado por su stty_id
    findById(stty_id: number): Promise<TblStateType>;
    // Obtener un tipo de estado por su stty_type
    findByType(stty_type: string): Promise<TblStateType>;
    // Actualizar un tipo de estado
    update(tblStateType: TblStateType): Promise<TblStateType>;
    // Eliminar un tipo de estado
    delete(stty_id: number): Promise<void>;
}