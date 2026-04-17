// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

export class PortfolioType {
    id: number;
    type: string;
    detail: string;
    state_type_id: number;   // FK al state_type.id
    state_type_name?: string; // Nombre del tipo de estado
    created_at: Date;
    updated_at: Date;
    responsible: string;
}