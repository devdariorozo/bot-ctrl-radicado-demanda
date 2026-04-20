// Responsabilidad: insertar datos iniciales (semilla) para portfolio_city_config.

import { DataSource } from 'typeorm';
import { PortfolioCityConfigEntity } from '../entities/portfolioCityConfig.entities';

/**
 * Seeds para `portfolio_city_config`.
 */
export const portfolioCityConfigSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(PortfolioCityConfigEntity);
  const now = new Date();

  // Ciudades requeridas en el Excel (mapeadas a la vista v_cities)
  const citiesFromExcel: Array<{
    id_city_views: number;
    name_departament: string;
    name_city: string;
    city: string;
  }> = [
    // ARAUCA
    { id_city_views: 1048, name_departament: 'ARAUCA', name_city: 'ARAUCA', city: 'ARAUCA - ARAUCA' },
    { id_city_views: 1053, name_departament: 'ARAUCA', name_city: 'SARAVENA', city: 'SARAVENA - ARAUCA' },
    { id_city_views: 1054, name_departament: 'ARAUCA', name_city: 'TAME', city: 'TAME - ARAUCA' },

    // ATLÁNTICO
    { id_city_views: 142, name_departament: 'ATLÁNTICO', name_city: 'SABANALARGA', city: 'SABANALARGA - ATLÁNTICO' },
    { id_city_views: 145, name_departament: 'ATLÁNTICO', name_city: 'SOLEDAD', city: 'SOLEDAD - ATLÁNTICO' },

    // BOGOTÁ (BOGOTÁ D.C. en el Excel)
    { id_city_views: 149, name_departament: 'BOGOTÁ', name_city: 'BOGOTÁ', city: 'BOGOTÁ - BOGOTÁ' },

    // BOLÍVAR
    { id_city_views: 151, name_departament: 'BOLÍVAR', name_city: 'ACHÍ', city: 'ACHÍ - BOLÍVAR' },
    { id_city_views: 152, name_departament: 'BOLÍVAR', name_city: 'ALTOS DEL ROSARIO', city: 'ALTOS DEL ROSARIO - BOLÍVAR' },
    { id_city_views: 153, name_departament: 'BOLÍVAR', name_city: 'ARENAL', city: 'ARENAL - BOLÍVAR' },
    { id_city_views: 154, name_departament: 'BOLÍVAR', name_city: 'ARJONA', city: 'ARJONA - BOLÍVAR' },
    { id_city_views: 155, name_departament: 'BOLÍVAR', name_city: 'ARROYOHONDO', city: 'ARROYOHONDO - BOLÍVAR' },
    { id_city_views: 156, name_departament: 'BOLÍVAR', name_city: 'BARRANCO DE LOBA', city: 'BARRANCO DE LOBA - BOLÍVAR' },
    { id_city_views: 157, name_departament: 'BOLÍVAR', name_city: 'CALAMAR', city: 'CALAMAR - BOLÍVAR' },
    { id_city_views: 158, name_departament: 'BOLÍVAR', name_city: 'CANTAGALLO', city: 'CANTAGALLO - BOLÍVAR' },
    { id_city_views: 150, name_departament: 'BOLÍVAR', name_city: 'CARTAGENA DE INDIAS', city: 'CARTAGENA DE INDIAS - BOLÍVAR' },
    { id_city_views: 159, name_departament: 'BOLÍVAR', name_city: 'CICUCO', city: 'CICUCO - BOLÍVAR' },
    { id_city_views: 161, name_departament: 'BOLÍVAR', name_city: 'CLEMENCIA', city: 'CLEMENCIA - BOLÍVAR' },
    { id_city_views: 160, name_departament: 'BOLÍVAR', name_city: 'CÓRDOBA', city: 'CÓRDOBA - BOLÍVAR' },
    { id_city_views: 162, name_departament: 'BOLÍVAR', name_city: 'EL CARMEN DE BOLÍVAR', city: 'EL CARMEN DE BOLÍVAR - BOLÍVAR' },
    { id_city_views: 163, name_departament: 'BOLÍVAR', name_city: 'EL GUAMO', city: 'EL GUAMO - BOLÍVAR' },
    { id_city_views: 164, name_departament: 'BOLÍVAR', name_city: 'EL PEÑÓN', city: 'EL PEÑÓN - BOLÍVAR' },
    { id_city_views: 165, name_departament: 'BOLÍVAR', name_city: 'HATILLO DE LOBA', city: 'HATILLO DE LOBA - BOLÍVAR' },
    { id_city_views: 166, name_departament: 'BOLÍVAR', name_city: 'MAGANGUÉ', city: 'MAGANGUÉ - BOLÍVAR' },
    { id_city_views: 167, name_departament: 'BOLÍVAR', name_city: 'MAHATES', city: 'MAHATES - BOLÍVAR' },
    { id_city_views: 168, name_departament: 'BOLÍVAR', name_city: 'MARGARITA', city: 'MARGARITA - BOLÍVAR' },
    { id_city_views: 169, name_departament: 'BOLÍVAR', name_city: 'MARÍA LA BAJA', city: 'MARÍA LA BAJA - BOLÍVAR' },
    { id_city_views: 171, name_departament: 'BOLÍVAR', name_city: 'SANTA CRUZ DE MOMPOX', city: 'SANTA CRUZ DE MOMPOX - BOLÍVAR' },
    { id_city_views: 170, name_departament: 'BOLÍVAR', name_city: 'MONTECRISTO', city: 'MONTECRISTO - BOLÍVAR' },
    { id_city_views: 172, name_departament: 'BOLÍVAR', name_city: 'MORALES', city: 'MORALES - BOLÍVAR' },
    { id_city_views: 173, name_departament: 'BOLÍVAR', name_city: 'NOROSÍ', city: 'NOROSÍ - BOLÍVAR' },
    { id_city_views: 174, name_departament: 'BOLÍVAR', name_city: 'PINILLOS', city: 'PINILLOS - BOLÍVAR' },
    { id_city_views: 175, name_departament: 'BOLÍVAR', name_city: 'REGIDOR', city: 'REGIDOR - BOLÍVAR' },
    { id_city_views: 176, name_departament: 'BOLÍVAR', name_city: 'RÍO VIEJO', city: 'RÍO VIEJO - BOLÍVAR' },
    { id_city_views: 177, name_departament: 'BOLÍVAR', name_city: 'SAN CRISTÓBAL', city: 'SAN CRISTÓBAL - BOLÍVAR' },
    { id_city_views: 178, name_departament: 'BOLÍVAR', name_city: 'SAN ESTANISLAO', city: 'SAN ESTANISLAO - BOLÍVAR' },
    { id_city_views: 179, name_departament: 'BOLÍVAR', name_city: 'SAN FERNANDO', city: 'SAN FERNANDO - BOLÍVAR' },
    { id_city_views: 180, name_departament: 'BOLÍVAR', name_city: 'SAN JACINTO', city: 'SAN JACINTO - BOLÍVAR' },
    { id_city_views: 181, name_departament: 'BOLÍVAR', name_city: 'SAN JACINTO DEL CAUCA', city: 'SAN JACINTO DEL CAUCA - BOLÍVAR' },
    { id_city_views: 182, name_departament: 'BOLÍVAR', name_city: 'SAN JUAN NEPOMUCENO', city: 'SAN JUAN NEPOMUCENO - BOLÍVAR' },
    { id_city_views: 183, name_departament: 'BOLÍVAR', name_city: 'SAN MARTÍN DE LOBA', city: 'SAN MARTÍN DE LOBA - BOLÍVAR' },
    { id_city_views: 184, name_departament: 'BOLÍVAR', name_city: 'SAN PABLO', city: 'SAN PABLO - BOLÍVAR' },
    { id_city_views: 185, name_departament: 'BOLÍVAR', name_city: 'SANTA CATALINA', city: 'SANTA CATALINA - BOLÍVAR' },
    { id_city_views: 186, name_departament: 'BOLÍVAR', name_city: 'SANTA ROSA', city: 'SANTA ROSA - BOLÍVAR' },
    { id_city_views: 187, name_departament: 'BOLÍVAR', name_city: 'SANTA ROSA DEL SUR', city: 'SANTA ROSA DEL SUR - BOLÍVAR' },
    { id_city_views: 188, name_departament: 'BOLÍVAR', name_city: 'SIMITÍ', city: 'SIMITÍ - BOLÍVAR' },
    { id_city_views: 189, name_departament: 'BOLÍVAR', name_city: 'SOPLAVIENTO', city: 'SOPLAVIENTO - BOLÍVAR' },
    { id_city_views: 190, name_departament: 'BOLÍVAR', name_city: 'TALAIGUA NUEVO', city: 'TALAIGUA NUEVO - BOLÍVAR' },
    { id_city_views: 191, name_departament: 'BOLÍVAR', name_city: 'TIQUISIO', city: 'TIQUISIO - BOLÍVAR' },
    { id_city_views: 192, name_departament: 'BOLÍVAR', name_city: 'TURBACO', city: 'TURBACO - BOLÍVAR' },
    { id_city_views: 193, name_departament: 'BOLÍVAR', name_city: 'TURBANÁ', city: 'TURBANÁ - BOLÍVAR' },
    { id_city_views: 194, name_departament: 'BOLÍVAR', name_city: 'VILLANUEVA', city: 'VILLANUEVA - BOLÍVAR' },
    { id_city_views: 195, name_departament: 'BOLÍVAR', name_city: 'ZAMBRANO', city: 'ZAMBRANO - BOLÍVAR' },

    // NORTE DE SANTANDER
    { id_city_views: 1122, name_departament: 'NORTE DE SANTANDER', name_city: 'CÚCUTA', city: 'CÚCUTA - NORTE DE SANTANDER' },
    { id_city_views: 801, name_departament: 'NORTE DE SANTANDER', name_city: 'LOS PATIOS', city: 'LOS PATIOS - NORTE DE SANTANDER' },
    { id_city_views: 804, name_departament: 'NORTE DE SANTANDER', name_city: 'OCAÑA', city: 'OCAÑA - NORTE DE SANTANDER' },
    { id_city_views: 805, name_departament: 'NORTE DE SANTANDER', name_city: 'PAMPLONA', city: 'PAMPLONA - NORTE DE SANTANDER' },
    { id_city_views: 819, name_departament: 'NORTE DE SANTANDER', name_city: 'VILLA DEL ROSARIO', city: 'VILLA DEL ROSARIO - NORTE DE SANTANDER' },

    // TOLIMA
    { id_city_views: 959, name_departament: 'TOLIMA', name_city: 'IBAGUÉ', city: 'IBAGUÉ - TOLIMA' },

    // CALDAS
    { id_city_views: 319, name_departament: 'CALDAS', name_city: 'MANIZALES', city: 'MANIZALES - CALDAS' },
  ];

  const ownDataBasesIds = [1, 2, 3, 4];

  const records: Partial<PortfolioCityConfigEntity>[] = [];

  // Para cada id_data_bases propias (1..4), recorrer TODO el listado de ciudades del Excel
  for (const idDataBases of ownDataBasesIds) {
    for (const cityCfg of citiesFromExcel) {
      records.push({
        id_data_bases: idDataBases,
        id_city_views: cityCfg.id_city_views,
        name_departament: cityCfg.name_departament,
        name_city: cityCfg.name_city,
        city: cityCfg.city,
        detail: 'Registro requerido en base de excel',
        state_type_id: 1,
        created_at: now,
        updated_at: now,
        responsible: 'BOT ctrl filed demand',
      });
    }
  }

  await repo.save(records);
};
