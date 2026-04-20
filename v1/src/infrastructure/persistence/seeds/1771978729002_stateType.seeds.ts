// Responsabilidad: insertar datos iniciales (semilla).

import { DataSource } from 'typeorm';
import { StateTypeEntity } from '../entities/stateType.entities';

export const stateTypeSeeds = async (dataSource: DataSource) => {
    const stateTypeRepository = dataSource.getRepository(StateTypeEntity);
    await stateTypeRepository.save([
        { type: 'Active', detail: 'Registro activo', created_at: new Date(), updated_at: new Date(), responsible: 'BOT ctrl filed demand' },
        { type: 'Inactive', detail: 'Registro inactivo', created_at: new Date(), updated_at: new Date(), responsible: 'BOT ctrl filed demand' },
    ]);
};