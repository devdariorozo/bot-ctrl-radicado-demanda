// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { TblEnvironmentType } from "@domain/entities/environmentType.entities";

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const TBL_ENVIRONMENT_TYPE_REPOSITORY = Symbol('TBL_ENVIRONMENT_TYPE_REPOSITORY');

/** Datos mínimos para crear un tipo de entorno (env_id y fechas son opcionales). */
export type CreateTblEnvironmentTypeInput = Pick<TblEnvironmentType, 'env_type' | 'env_detail' | 'env_responsible'> & Partial<TblEnvironmentType>;

export interface TblEnvironmentTypeRepository {
    // Crear un nuevo tipo de entorno
    create(tblEnvironmentType: CreateTblEnvironmentTypeInput): Promise<TblEnvironmentType>;
    // Buscar si el tipo de entorno ya existe
    findByDuplicate(env_type: string): Promise<TblEnvironmentType | null>;
    // Obtener todos los tipos de entorno
    findAll(): Promise<TblEnvironmentType[]>;
    // Obtener un tipo de entorno por su env_id
    findById(env_id: number): Promise<TblEnvironmentType>;
    // Obtener un tipo de entorno por su env_type
    findByType(env_type: string): Promise<TblEnvironmentType>;
    // Actualizar un tipo de entorno
    update(tblEnvironmentType: TblEnvironmentType): Promise<TblEnvironmentType>;
    // Eliminar un tipo de entorno
    delete(env_id: number): Promise<void>;
}

