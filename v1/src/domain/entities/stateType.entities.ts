// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

export class StateType {
    id: number;
    type: string;
    detail: string;
    created_at: Date;
    updated_at: Date;
    responsible: string;
}