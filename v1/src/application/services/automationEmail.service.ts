// Responsabilidad: servicio de aplicación para automationEmail.

import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AutomationEmail } from '@domain/entities/automationEmail.entities';
import {
  AUTOMATION_EMAIL_REPOSITORY,
  AutomationEmailRepository,
  CreateAutomationEmailInput,
  FindAllAutomationEmailFilters,
} from '@domain/ports/automationEmail.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';

@Injectable()
export class AutomationEmailService {
  constructor(
    @Inject(AUTOMATION_EMAIL_REPOSITORY)
    private readonly repository: AutomationEmailRepository,
  ) {}

  async create(input: CreateAutomationEmailInput): Promise<AutomationEmail> {
    const existing = await this.repository.findBySubjectAndDate(
      input.autm_subject,
      input.autm_date_received,
    );

    if (existing) {
      throw new ConflictException({
        message: 'El registro ya existe',
        autm_subject: input.autm_subject,
        autm_date_received: input.autm_date_received,
      });
    }

    try {
      return await this.repository.create(input);
    } catch {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(filters: FindAllAutomationEmailFilters = {}): Promise<AutomationEmail[]> {
    try {
      return await this.repository.findAll(filters);
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findById(id: number): Promise<AutomationEmail> {
    try {
      return await this.repository.findById(id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id });
    }
  }

  async update(data: AutomationEmail): Promise<void> {
    let existing: AutomationEmail;
    try {
      existing = await this.repository.findById(data.autm_id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id: data.autm_id });
    }

    const toText = (v: string | null | undefined): string => (v ? String(v).trim() : '');

    const hasChanges =
      existing.autm_from_email !== data.autm_from_email ||
      existing.autm_to_email !== data.autm_to_email ||
      toText(existing.autm_date_received) !== toText(data.autm_date_received) ||
      existing.autm_subject !== data.autm_subject ||
      (existing.autm_departament ?? null) !== (data.autm_departament ?? null) ||
      (existing.autm_city ?? null) !== (data.autm_city ?? null) ||
      (existing.autm_locality ?? null) !== (data.autm_locality ?? null) ||
      (existing.autm_specialty ?? null) !== (data.autm_specialty ?? null) ||
      (existing.autm_process_class ?? null) !== (data.autm_process_class ?? null) ||
      (existing.autm_subject_demanding ?? null) !== (data.autm_subject_demanding ?? null) ||
      (existing.autm_artificial_person ?? null) !== (data.autm_artificial_person ?? null) ||
      (existing.autm_document_type_1 ?? null) !== (data.autm_document_type_1 ?? null) ||
      (existing.autm_document_number_1 ?? null) !== (data.autm_document_number_1 ?? null) ||
      (existing.autm_email_1 ?? null) !== (data.autm_email_1 ?? null) ||
      (existing.autm_address_1 ?? null) !== (data.autm_address_1 ?? null) ||
      (existing.autm_phone_number_1 ?? null) !== (data.autm_phone_number_1 ?? null) ||
      (existing.autm_subject_defendant ?? null) !== (data.autm_subject_defendant ?? null) ||
      (existing.autm_natural_person ?? null) !== (data.autm_natural_person ?? null) ||
      (existing.autm_document_type_2 ?? null) !== (data.autm_document_type_2 ?? null) ||
      (existing.autm_document_number_2 ?? null) !== (data.autm_document_number_2 ?? null) ||
      (existing.autm_email_2 ?? null) !== (data.autm_email_2 ?? null) ||
      (existing.autm_address_2 ?? null) !== (data.autm_address_2 ?? null) ||
      (existing.autm_phone_number_2 ?? null) !== (data.autm_phone_number_2 ?? null) ||
      (existing.autm_number_filed ?? null) !== (data.autm_number_filed ?? null) ||
      existing.autm_automation_status !== data.autm_automation_status ||
      (existing.autm_detail ?? null) !== (data.autm_detail ?? null) ||
      existing.autm_status_type_id !== data.autm_status_type_id ||
      existing.autm_responsible !== data.autm_responsible;

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar', id: data.autm_id });
    }

    const toSave: AutomationEmail = {
      ...data,
      autm_created_at: existing.autm_created_at,
      autm_updated_at: new Date(),
    };

    try {
      await this.repository.update(toSave);
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async findOpciones(): Promise<{ autm_automation_status: string }[]> {
    try {
      return await this.repository.findOpciones();
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findOpcionesActivas(): Promise<{ autm_automation_status: string }[]> {
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
