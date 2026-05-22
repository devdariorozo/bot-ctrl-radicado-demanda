// Responsabilidad: insertar datos iniciales (semilla).

import { DataSource } from 'typeorm';
import { TblStateTypeEntity } from '../entities/stateType.entities';

export const tblStateTypeSeeds = async (dataSource: DataSource) => {
    const repo = dataSource.getRepository(TblStateTypeEntity);
    const now = new Date();
    await repo.save([
        { stty_type: 'Active', stty_detail: 'Registro activo', stty_created_at: now, stty_updated_at: now, stty_responsible: 'BOT ctrl radicado demanda' },
        { stty_type: 'Inactive', stty_detail: 'Registro inactivo', stty_created_at: now, stty_updated_at: now, stty_responsible: 'BOT ctrl radicado demanda' },
    ]);
};