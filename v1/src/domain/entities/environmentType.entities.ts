// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

export class EnvironmentType {
    id: number;
    type: string;
    detail: string;
    created_at: Date;
    updated_at: Date;
    responsible: string;
}
