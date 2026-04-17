// Responsabilidad: contratos del dominio para amount_type.

import { AmountType } from '@domain/entities/amountType.entities';

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const AMOUNT_TYPE_REPOSITORY = Symbol('AMOUNT_TYPE_REPOSITORY');

/** Datos mínimos para crear un tipo de cuantía (id y fechas son opcionales). */
export type CreateAmountTypeInput = Pick<
  AmountType,
  'type' | 'specialty_process' | 'class_process' | 'detail' | 'state_type_id' | 'responsible'
> &
  Partial<AmountType>;

export interface AmountTypeRepository {
  // Crear un nuevo tipo de cuantía
  create(input: CreateAmountTypeInput): Promise<AmountType>;
  // Buscar si el tipo de cuantía ya existe
  findByDuplicate(type: string): Promise<AmountType | null>;
  // Obtener todos los tipos de cuantía
  findAll(): Promise<AmountType[]>;
  // Obtener un tipo de cuantía por su id
  findById(id: number): Promise<AmountType>;
  // Actualizar un tipo de cuantía
  update(amountType: AmountType): Promise<AmountType>;
  // Eliminar un tipo de cuantía
  delete(id: number): Promise<void>;
}

