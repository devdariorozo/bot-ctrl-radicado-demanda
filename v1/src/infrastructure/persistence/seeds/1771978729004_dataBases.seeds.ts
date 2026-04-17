// Responsabilidad: insertar datos iniciales (semilla) para data_bases.

import { DataSource } from 'typeorm';
import { DataBasesEntity } from '../entities/dataBases.entities';
import { BasesConfig } from '@domain/entities/dataBases.entities';

// Bases no productivas (dev, docker, qa) — cartera propia
const BASES_PROPIAS_NO_PRO: BasesConfig = {
  miosv2_carteras_QA: {
    generate_pdf_demand_service: {
      url: 'https://qa-cartera.groupcos.com/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_cartera_mirror: {
    generate_pdf_demand_service: {
      url: 'https://6931-200-122-234-74.ngrok-free.app/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
};

// Bases productivas — cartera propia (ambiente pro)
const CARTERA_PROPIA_BASES_PRO: BasesConfig = {
  miosv2_banco_bogota_2024: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_bancobogota-2024/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_banco_bogota_2025: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_bancobogota-2025/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_banco_nu: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_nu_back/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_cartera_popular: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_carteras: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_falabella_2020: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_falabella2020/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_falabella_2021: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_falabella2021/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_falabella_2023: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_falabella2023/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_falabella_2024: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_falabella2024/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_popular_2020: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_bancopopular-2020/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_popular_2021: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_bancopopular-2021/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_serfinanza_2023: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_serfinanza2023/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_serfinanza_2024: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_serfinanza2024/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_serfinanza_2025: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_serfinanza_2025/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_serfinanza_2025_2: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_serfinanza_2025_v2/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_tuya_2022: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_tuya_2022_v2_bogota/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_tuya_agosto_2022: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_tuya_comercial_2022/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_tuya_jud_2021: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_tuya_judicializada_2021/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_tuya_medellin_2021: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_tuya_comercial_2021/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_tuya_medellin_jud_2022: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_tuya_judicializada_2022/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_tuya_serfinanza_2022: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_tuya_serfinanza/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  miosv2_bbva_2025: {
    generate_pdf_demand_service: {
      url: 'https://backendcartera.groupcos.com/cartera_bancobbva-2025/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
};

// Bases no productivas (dev, docker, qa) — cartera sudameris
const BASES_SUDAMERIS_NO_PRO: BasesConfig = {
  miosv2_cartera_sudameris_qa: {
    generate_pdf_demand_service: {
      url: 'https://qa-sudameris.groupcos.com/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
};

// Bases de ejemplo — cartera sudameris pro
const BASES_SUDAMERIS_PRO_EJEMPLO: BasesConfig = {
  ejemplo1: {
    generate_pdf_demand_service: {
      url: 'https://prod-sudameris.groupcos.com/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  ejemplo2: {
    generate_pdf_demand_service: {
      url: 'https://prod-sudameris.groupcos.com/cartera2/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
};

export const dataBasesSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(DataBasesEntity);
  const now = new Date();

  await repo.save([
    // Primero cartera 1 ordenada por ambientes 1,2,3,4
    // Ambientes 1, 2, 3 (dev, docker, qa) — portfolio 1: bases no productivas
    {
      environment_type_id: 1, // dev
      portfolio_type_id: 1,
      bases: BASES_PROPIAS_NO_PRO,
      detail: 'Listado base de datos correspondiente a la cartera propia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
    {
      environment_type_id: 2, // docker
      portfolio_type_id: 1,
      bases: BASES_PROPIAS_NO_PRO,
      detail: 'Listado base de datos correspondiente a la cartera propia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
    {
      environment_type_id: 3, // qa
      portfolio_type_id: 1,
      bases: BASES_PROPIAS_NO_PRO,
      detail: 'Listado base de datos correspondiente a la cartera propia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
    // Ambiente 4 (pro) — portfolio 1: listado completo de cartera propia con URLs de producción
    {
      environment_type_id: 4, // pro
      portfolio_type_id: 1,
      bases: CARTERA_PROPIA_BASES_PRO,
      detail: 'Listado base de datos correspondiente a la cartera propia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },

    // Luego cartera 2 ordenada por ambientes 1,2,3,4
    // Ambientes 1, 2, 3 — portfolio 2: Sudameris QA
    {
      environment_type_id: 1,
      portfolio_type_id: 2,
      bases: BASES_SUDAMERIS_NO_PRO,
      detail: 'Listado base de datos correspondiente a la cartera sudameris',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
    {
      environment_type_id: 2,
      portfolio_type_id: 2,
      bases: BASES_SUDAMERIS_NO_PRO,
      detail: 'Listado base de datos correspondiente a la cartera sudameris',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
    {
      environment_type_id: 3,
      portfolio_type_id: 2,
      bases: BASES_SUDAMERIS_NO_PRO,
      detail: 'Listado base de datos correspondiente a la cartera sudameris',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
    // Ambiente 4 (pro) — portfolio 2: bases de ejemplo
    {
      environment_type_id: 4,
      portfolio_type_id: 2,
      bases: BASES_SUDAMERIS_PRO_EJEMPLO,
      detail: 'Listado base de datos correspondiente a la cartera sudameris',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
  ]);
};
