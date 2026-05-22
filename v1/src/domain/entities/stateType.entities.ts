// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

export class TblStateType {
    stty_id: number;
    stty_type: string;
    stty_detail: string;
    stty_created_at: Date;
    stty_updated_at: Date;
    stty_responsible: string;
}