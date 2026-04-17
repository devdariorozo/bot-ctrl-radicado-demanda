// Responsabilidad: insertar datos iniciales (semilla) para management_demands_online.

import { DataSource } from 'typeorm';
import { ManagementDemandsOnlineEntity } from '../entities/managementDemandsOnline.entities';

export const managementDemandsOnlineSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(ManagementDemandsOnlineEntity);
  // Sin registros iniciales: la tabla se deja vacía para que el bot o el usuario creen demandas pendientes.
  await repo.save([]);
};
