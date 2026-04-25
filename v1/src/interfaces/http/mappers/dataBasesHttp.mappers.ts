// Responsabilidad: mapeo entre cuerpos HTTP (prefijo `db_`) y el dominio, y a respuesta pública.

import { BasesConfig, DataBases } from '@domain/entities/dataBases.entities';
import { CreateDataBasesInput } from '@domain/ports/dataBases.ports';
import { DataBasesDto, UpdateDataBasesDto } from '../dto/dataBases.dto';

export function fromCreateDataBasesDto(dto: DataBasesDto): CreateDataBasesInput {
  return {
    environment_type_id: dto.db_environment_type_id,
    portfolio_type_id: dto.db_portfolio_type_id,
    bases: dto.db_bases as BasesConfig,
    detail: dto.db_detail,
    state_type_id: dto.db_state_type_id,
    responsible: dto.db_responsible,
  };
}

export function fromUpdateDataBasesDto(dto: UpdateDataBasesDto, id: number): DataBases {
  return {
    id,
    environment_type_id: dto.db_environment_type_id,
    portfolio_type_id: dto.db_portfolio_type_id,
    bases: dto.db_bases as BasesConfig,
    detail: dto.db_detail,
    state_type_id: dto.db_state_type_id,
    responsible: dto.db_responsible,
  } as unknown as DataBases;
}
/**
 * Misma forma y orden de claves en listar / filtrar / crear (tras reconsulta enriquecida).
 * Tras cada FK: id, luego nombre del catálogo (si aplica), luego el resto de columnas.
 */
export function toDataBasesApi(d: DataBases): Record<string, unknown> {
  const o: Record<string, unknown> = {
    db_id: d.id,
    db_environment_type_id: d.environment_type_id,
  };
  if (d.environment_type_name != null && String(d.environment_type_name).length > 0) {
    o.environment_type_name = d.environment_type_name;
  }
  o.db_portfolio_type_id = d.portfolio_type_id;
  if (d.portfolio_type_name != null && String(d.portfolio_type_name).length > 0) {
    o.portfolio_type_name = d.portfolio_type_name;
  }
  o.db_bases = d.bases;
  o.db_detail = d.detail;
  o.db_state_type_id = d.state_type_id;
  if (d.state_type_name != null && String(d.state_type_name).length > 0) {
    o.state_type_name = d.state_type_name;
  }
  o.db_responsible = d.responsible;
  o.db_created_at = d.created_at;
  o.db_updated_at = d.updated_at;
  if (d.label_data_base != null && String(d.label_data_base).length > 0) {
    o.label_data_base = d.label_data_base;
  }
  if (d.portfolio_state_type_name != null && String(d.portfolio_state_type_name).length > 0) {
    o.portfolio_state_type_name = d.portfolio_state_type_name;
  }
  return o;
}

