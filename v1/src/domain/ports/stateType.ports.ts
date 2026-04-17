// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { StateType } from "@domain/entities/stateType.entities";

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const STATE_TYPE_REPOSITORY = Symbol('STATE_TYPE_REPOSITORY');

/** Datos mínimos para crear un tipo de estado (id y fechas son opcionales). */
export type CreateStateTypeInput = Pick<StateType, 'type' | 'detail' | 'responsible'> & Partial<StateType>;

export interface StateTypeRepository {
    // Crear un nuevo tipo de estado
    create(stateType: CreateStateTypeInput): Promise<StateType>;
    // Buscar si el tipo de estado ya existe
    findByDuplicate(type: string):  Promise<StateType | null>;
    // Obtener todos los tipos de estado
    findAll(): Promise<StateType[]>;
    // Obtener un tipo de estado por su id
    findById(id: number): Promise<StateType>;
    // Obntener un tipo de estado por su type
    findByType(type: string): Promise<StateType>;
    // Actualizar un tipo de estado
    update(stateType: StateType): Promise<StateType>;
    // Eliminar un tipo de estado
    delete(id: number): Promise<void>;
}