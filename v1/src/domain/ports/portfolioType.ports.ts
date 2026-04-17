// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { PortfolioType } from "@domain/entities/portfolioType.entities";

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const PORTFOLIO_TYPE_REPOSITORY = Symbol('PORTFOLIO_TYPE_REPOSITORY');

/** Datos mínimos para crear un tipo de cartera (id y fechas son opcionales). */
export type CreatePortfolioTypeInput = Pick<PortfolioType, 'type' | 'detail' | 'state_type_id' | 'responsible'> & Partial<PortfolioType>;

export interface PortfolioTypeRepository {
    // Crear un nuevo tipo de cartera
    create(PortfolioType: CreatePortfolioTypeInput): Promise<PortfolioType>;
    // Buscar si el tipo de cartera ya existe
    findByDuplicate(type: string):  Promise<PortfolioType | null>;
    // Obtener todos los tipos de cartera
    findAll(): Promise<PortfolioType[]>;
    // Obtener un tipo de cartera por su id
    findById(id: number): Promise<PortfolioType>;
    // Obntener un tipo de cartera por su type
    findByType(type: string): Promise<PortfolioType>;
    // Actualizar un tipo de cartera
    update(PortfolioType: PortfolioType): Promise<PortfolioType>;
    // Eliminar un tipo de cartera
    delete(id: number): Promise<void>;
}