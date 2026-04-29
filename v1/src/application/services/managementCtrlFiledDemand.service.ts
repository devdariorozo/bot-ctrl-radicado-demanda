// Responsabilidad: servicio de aplicación para managementCtrlFiledDemand.

import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ManagementCtrlFiledDemand } from '@domain/entities/managementCtrlFiledDemand.entities';
import {
  CreateManagementCtrlFiledDemandInput,
  FindAllManagementCtrlFiledDemandFilters,
  MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY,
  ManagementCtrlFiledDemandRepository,
} from '@domain/ports/managementCtrlFiledDemand.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';

@Injectable()
export class ManagementCtrlFiledDemandService {
  constructor(
    @Inject(MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY)
    private readonly repository: ManagementCtrlFiledDemandRepository,
  ) {}

  async create(input: CreateManagementCtrlFiledDemandInput): Promise<ManagementCtrlFiledDemand> {
    const active = await this.repository.findActiveForDemand(
      input.mcfd_portfolio_type_id,
      input.mcfd_lawsuit_id,
      input.mcfd_lawsuits_filings_id,
    );

    if (active) {
      throw new ConflictException({
        message: 'Ya existe un registro activo para esta demanda',
        mcfd_portfolio_type_id: input.mcfd_portfolio_type_id,
        mcfd_lawsuit_id: input.mcfd_lawsuit_id,
        mcfd_lawsuits_filings_id: input.mcfd_lawsuits_filings_id,
      });
    }

    try {
      return await this.repository.create(input);
    } catch {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(filters: FindAllManagementCtrlFiledDemandFilters = {}): Promise<ManagementCtrlFiledDemand[]> {
    try {
      return await this.repository.findAll(filters);
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findById(id: number): Promise<ManagementCtrlFiledDemand> {
    try {
      return await this.repository.findById(id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id });
    }
  }

  async update(data: ManagementCtrlFiledDemand): Promise<void> {
    let existing: ManagementCtrlFiledDemand;
    try {
      existing = await this.repository.findById(data.mcfd_id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id: data.mcfd_id });
    }

    const toDateStr = (val: Date | null | undefined): string =>
      val ? (val instanceof Date ? val.toISOString().slice(0, 10) : String(val).slice(0, 10)) : '';

    const hasChanges =
      existing.mcfd_portfolio_type_id !== data.mcfd_portfolio_type_id ||
      existing.mcfd_name_data_base !== data.mcfd_name_data_base ||
      existing.mcfd_lawsuit_id !== data.mcfd_lawsuit_id ||
      existing.mcfd_lawsuits_filings_id !== data.mcfd_lawsuits_filings_id ||
      existing.mcfd_client_id !== data.mcfd_client_id ||
      (existing.mcfd_automation_email_id ?? null) !== (data.mcfd_automation_email_id ?? null) ||
      (existing.mcfd_last_execution ? existing.mcfd_last_execution.toISOString() : null) !==
        (data.mcfd_last_execution ? data.mcfd_last_execution.toISOString() : null) ||
      (existing.mcfd_retries ?? 0) !== (data.mcfd_retries ?? 0) ||
      toDateStr(existing.mcfd_filing_date) !== toDateStr(data.mcfd_filing_date) ||
      toDateStr(existing.mcfd_filing_date_action) !== toDateStr(data.mcfd_filing_date_action) ||
      (existing.mcfd_number_filed ?? null) !== (data.mcfd_number_filed ?? null) ||
      existing.mcfd_management_status !== data.mcfd_management_status ||
      (existing.mcfd_detail ?? null) !== (data.mcfd_detail ?? null) ||
      existing.mcfd_state_type_id !== data.mcfd_state_type_id ||
      existing.mcfd_responsible !== data.mcfd_responsible;

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar', id: data.mcfd_id });
    }

    const toSave: ManagementCtrlFiledDemand = {
      ...data,
      mcfd_created_at: existing.mcfd_created_at,
      mcfd_updated_at: new Date(),
    };

    try {
      await this.repository.update(toSave);
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async findOpciones(): Promise<{ mcfd_management_status: string }[]> {
    try {
      return await this.repository.findOpciones();
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findOpcionesActivas(): Promise<{ mcfd_management_status: string }[]> {
    try {
      return await this.repository.findOpcionesActivas();
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.repository.findById(id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id });
    }

    try {
      await this.repository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}
