// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { EnvironmentType } from "@domain/entities/environmentType.entities";

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const ENVIRONMENT_TYPE_REPOSITORY = Symbol('ENVIRONMENT_TYPE_REPOSITORY');

/** Datos mínimos para crear un tipo de entorno (id y fechas son opcionales). */
export type CreateEnvironmentTypeInput = Pick<EnvironmentType, 'type' | 'detail' | 'responsible'> & Partial<EnvironmentType>;

export interface EnvironmentTypeRepository {
    // Crear un nuevo tipo de entorno
    create(environmentType: CreateEnvironmentTypeInput): Promise<EnvironmentType>;
    // Buscar si el tipo de entorno ya existe
    findByDuplicate(type: string):  Promise<EnvironmentType | null>;
    // Obtener todos los tipos de entorno
    findAll(): Promise<EnvironmentType[]>;
    // Obtener un tipo de entorno por su id
    findById(id: number): Promise<EnvironmentType>;
    // Obntener un tipo de entorno por su type
    findByType(type: string): Promise<EnvironmentType>;
    // Actualizar un tipo de entorno
    update(environmentType: EnvironmentType): Promise<EnvironmentType>;
    // Eliminar un tipo de entorno
    delete(id: number): Promise<void>;
}

