// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

export class TblPortfolioType {
    porty_id: number;
    porty_type: string;
    porty_detail: string;
    porty_state_type_id: number;
    state_type_name?: string;
    porty_created_at: Date;
    porty_updated_at: Date;
    porty_responsible: string;
}
