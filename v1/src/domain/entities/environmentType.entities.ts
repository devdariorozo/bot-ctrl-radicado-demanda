// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

export class TblEnvironmentType {
    env_id: number;
    env_type: string;
    env_detail: string;
    env_created_at: Date;
    env_updated_at: Date;
    env_responsible: string;
}
