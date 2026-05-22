// Responsabilidad: mapeo entre cuerpos HTTP (prefijo `db_`) y el dominio, y a respuesta pública.

import { BasesConfig, DataBases } from '@domain/entities/dataBases.entities';
import { CreateDataBasesInput } from '@domain/ports/dataBases.ports';
import { DataBasesDto, UpdateDataBasesDto } from '../dto/dataBases.dto';

export function fromCreateDataBasesDto(dto: DataBasesDto): CreateDataBasesInput {
  return {
    db_environment_type_id: dto.db_environment_type_id,
    db_portfolio_type_id: dto.db_portfolio_type_id,
    db_bases: dto.db_bases as BasesConfig,
    db_detail: dto.db_detail,
    db_state_type_id: dto.db_state_type_id,
    db_responsible: dto.db_responsible,
  };
}

export function fromUpdateDataBasesDto(dto: UpdateDataBasesDto, id: number): DataBases {
  return {
    db_id: id,
    db_environment_type_id: dto.db_environment_type_id,
    db_portfolio_type_id: dto.db_portfolio_type_id,
    db_bases: dto.db_bases as BasesConfig,
    db_detail: dto.db_detail,
    db_state_type_id: dto.db_state_type_id,
    db_responsible: dto.db_responsible,
  } as unknown as DataBases;
}

/**
 * Misma forma y orden de claves en listar / filtrar / crear (tras reconsulta enriquecida).
 * Tras cada FK: id, luego nombre del catálogo (si aplica), luego el resto de columnas.
 */
export function toDataBasesApi(d: DataBases): Record<string, unknown> {
  const o: Record<string, unknown> = {
    db_id: d.db_id,
    db_environment_type_id: d.db_environment_type_id,
  };
  if (d.environment_type_name != null && String(d.environment_type_name).length > 0) {
    o.environment_type_name = d.environment_type_name;
  }
  o.db_portfolio_type_id = d.db_portfolio_type_id;
  if (d.portfolio_type_name != null && String(d.portfolio_type_name).length > 0) {
    o.portfolio_type_name = d.portfolio_type_name;
  }
  o.db_bases = d.db_bases;
  o.db_detail = d.db_detail;
  o.db_state_type_id = d.db_state_type_id;
  if (d.state_type_name != null && String(d.state_type_name).length > 0) {
    o.state_type_name = d.state_type_name;
  }
  o.db_responsible = d.db_responsible;
  o.db_created_at = d.db_created_at;
  o.db_updated_at = d.db_updated_at;
  if (d.label_data_base != null && String(d.label_data_base).length > 0) {
    o.label_data_base = d.label_data_base;
  }
  if (d.portfolio_state_type_name != null && String(d.portfolio_state_type_name).length > 0) {
    o.portfolio_state_type_name = d.portfolio_state_type_name;
  }
  return o;
}
