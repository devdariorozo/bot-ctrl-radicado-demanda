// Responsabilidad: implementación TypeORM de AutomationEmailRepository.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AutomationEmail } from '@domain/entities/automationEmail.entities';
import {
  AutomationEmailRepository,
  CreateAutomationEmailInput,
  FindAllAutomationEmailFilters,
} from '@domain/ports/automationEmail.ports';
import { AutomationEmailEntity } from '../entities/automationEmail.entities';
import { TblStateTypeEntity } from '../entities/stateType.entities';

@Injectable()
export class AutomationEmailRepositoryImpl implements AutomationEmailRepository {
  private readonly repo: Repository<AutomationEmailEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(AutomationEmailEntity);
  }

  async create(input: CreateAutomationEmailInput): Promise<AutomationEmail> {
    const now = new Date();
    const entity: Partial<AutomationEmailEntity> = {
      autm_from_email: input.autm_from_email,
      autm_to_email: input.autm_to_email,
      autm_date_received: input.autm_date_received,
      autm_subject: input.autm_subject,
      autm_departament: input.autm_departament ?? null,
      autm_city: input.autm_city ?? null,
      autm_locality: input.autm_locality ?? null,
      autm_specialty: input.autm_specialty ?? null,
      autm_process_class: input.autm_process_class ?? null,
      autm_subject_demanding: input.autm_subject_demanding ?? null,
      autm_artificial_person: input.autm_artificial_person ?? null,
      autm_document_type_1: input.autm_document_type_1 ?? null,
      autm_document_number_1: input.autm_document_number_1 ?? null,
      autm_email_1: input.autm_email_1 ?? null,
      autm_address_1: input.autm_address_1 ?? null,
      autm_phone_number_1: input.autm_phone_number_1 ?? null,
      autm_subject_defendant: input.autm_subject_defendant ?? null,
      autm_natural_person: input.autm_natural_person ?? null,
      autm_document_type_2: input.autm_document_type_2 ?? null,
      autm_document_number_2: input.autm_document_number_2 ?? null,
      autm_email_2: input.autm_email_2 ?? null,
      autm_address_2: input.autm_address_2 ?? null,
      autm_phone_number_2: input.autm_phone_number_2 ?? null,
      autm_number_filed: input.autm_number_filed ?? null,
      autm_automation_status: input.autm_automation_status,
      autm_detail: input.autm_detail ?? null,
      autm_status_type_id: input.autm_status_type_id,
      autm_created_at: now,
      autm_updated_at: now,
      autm_responsible: input.autm_responsible,
    };
    const saved = await this.repo.save(entity as AutomationEmailEntity);
    return this.findById(saved.autm_id);
  }

  async findAll(filters: FindAllAutomationEmailFilters = {}): Promise<AutomationEmail[]> {
    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = m.autm_status_type_id')
      .select('m.autm_id', 'autm_id')
      .addSelect('m.autm_from_email', 'autm_from_email')
      .addSelect('m.autm_to_email', 'autm_to_email')
      .addSelect('m.autm_date_received', 'autm_date_received')
      .addSelect('m.autm_subject', 'autm_subject')
      .addSelect('m.autm_departament', 'autm_departament')
      .addSelect('m.autm_city', 'autm_city')
      .addSelect('m.autm_locality', 'autm_locality')
      .addSelect('m.autm_specialty', 'autm_specialty')
      .addSelect('m.autm_process_class', 'autm_process_class')
      .addSelect('m.autm_subject_demanding', 'autm_subject_demanding')
      .addSelect('m.autm_artificial_person', 'autm_artificial_person')
      .addSelect('m.autm_document_type_1', 'autm_document_type_1')
      .addSelect('m.autm_document_number_1', 'autm_document_number_1')
      .addSelect('m.autm_email_1', 'autm_email_1')
      .addSelect('m.autm_address_1', 'autm_address_1')
      .addSelect('m.autm_phone_number_1', 'autm_phone_number_1')
      .addSelect('m.autm_subject_defendant', 'autm_subject_defendant')
      .addSelect('m.autm_natural_person', 'autm_natural_person')
      .addSelect('m.autm_document_type_2', 'autm_document_type_2')
      .addSelect('m.autm_document_number_2', 'autm_document_number_2')
      .addSelect('m.autm_email_2', 'autm_email_2')
      .addSelect('m.autm_address_2', 'autm_address_2')
      .addSelect('m.autm_phone_number_2', 'autm_phone_number_2')
      .addSelect('m.autm_number_filed', 'autm_number_filed')
      .addSelect('m.autm_automation_status', 'autm_automation_status')
      .addSelect('m.autm_detail', 'autm_detail')
      .addSelect('m.autm_status_type_id', 'autm_status_type_id')
      .addSelect('m.autm_created_at', 'autm_created_at')
      .addSelect('m.autm_updated_at', 'autm_updated_at')
      .addSelect('m.autm_responsible', 'autm_responsible')
      .addSelect('st.stty_type', 'state_type_name');

    if (filters.start_date) {
      qb.andWhere('m.autm_created_at >= :start_date', { start_date: filters.start_date });
    }
    if (filters.end_date) {
      qb.andWhere('m.autm_created_at <= :end_date', { end_date: filters.end_date });
    }
    if (filters.autm_date_received) {
      qb.andWhere('m.autm_date_received LIKE :autm_date_received', { autm_date_received: `%${filters.autm_date_received}%` });
    }
    if (filters.autm_from_email) {
      qb.andWhere('m.autm_from_email LIKE :autm_from_email', { autm_from_email: `%${filters.autm_from_email}%` });
    }
    if (filters.autm_to_email) {
      qb.andWhere('m.autm_to_email LIKE :autm_to_email', { autm_to_email: `%${filters.autm_to_email}%` });
    }
    if (filters.autm_departament) {
      qb.andWhere('m.autm_departament = :autm_departament', { autm_departament: filters.autm_departament });
    }
    if (filters.autm_city) {
      qb.andWhere('m.autm_city = :autm_city', { autm_city: filters.autm_city });
    }
    if (filters.autm_locality) {
      qb.andWhere('m.autm_locality LIKE :autm_locality', { autm_locality: `%${filters.autm_locality}%` });
    }
    if (filters.autm_specialty) {
      qb.andWhere('m.autm_specialty LIKE :autm_specialty', { autm_specialty: `%${filters.autm_specialty}%` });
    }
    if (filters.autm_process_class) {
      qb.andWhere('m.autm_process_class LIKE :autm_process_class', { autm_process_class: `%${filters.autm_process_class}%` });
    }
    if (filters.autm_subject_demanding) {
      qb.andWhere('m.autm_subject_demanding LIKE :autm_subject_demanding', { autm_subject_demanding: `%${filters.autm_subject_demanding}%` });
    }
    if (filters.autm_artificial_person) {
      qb.andWhere('m.autm_artificial_person LIKE :autm_artificial_person', { autm_artificial_person: `%${filters.autm_artificial_person}%` });
    }
    if (filters.autm_document_number_1) {
      qb.andWhere('m.autm_document_number_1 = :autm_document_number_1', { autm_document_number_1: filters.autm_document_number_1 });
    }
    if (filters.autm_email_1) {
      qb.andWhere('m.autm_email_1 = :autm_email_1', { autm_email_1: filters.autm_email_1 });
    }
    if (filters.autm_address_1) {
      qb.andWhere('m.autm_address_1 LIKE :autm_address_1', { autm_address_1: `%${filters.autm_address_1}%` });
    }
    if (filters.autm_phone_number_1) {
      qb.andWhere('m.autm_phone_number_1 = :autm_phone_number_1', { autm_phone_number_1: filters.autm_phone_number_1 });
    }
    if (filters.autm_natural_person) {
      qb.andWhere('m.autm_natural_person LIKE :autm_natural_person', { autm_natural_person: `%${filters.autm_natural_person}%` });
    }
    if (filters.autm_document_number_2) {
      qb.andWhere('m.autm_document_number_2 = :autm_document_number_2', { autm_document_number_2: filters.autm_document_number_2 });
    }
    if (filters.autm_email_2) {
      qb.andWhere('m.autm_email_2 LIKE :autm_email_2', { autm_email_2: `%${filters.autm_email_2}%` });
    }
    if (filters.autm_address_2) {
      qb.andWhere('m.autm_address_2 LIKE :autm_address_2', { autm_address_2: `%${filters.autm_address_2}%` });
    }
    if (filters.autm_phone_number_2) {
      qb.andWhere('m.autm_phone_number_2 = :autm_phone_number_2', { autm_phone_number_2: filters.autm_phone_number_2 });
    }
    if (filters.autm_number_filed) {
      qb.andWhere('m.autm_number_filed = :autm_number_filed', { autm_number_filed: filters.autm_number_filed });
    }
    if (filters.autm_automation_status) {
      qb.andWhere('m.autm_automation_status = :autm_automation_status', { autm_automation_status: filters.autm_automation_status });
    }
    if (filters.autm_status_type_id !== undefined) {
      qb.andWhere('m.autm_status_type_id = :autm_status_type_id', { autm_status_type_id: filters.autm_status_type_id });
    }

    qb.orderBy('m.autm_id', 'DESC');
    const raw = await qb.getRawMany();
    return raw.map((row: Record<string, unknown>) => this.rowToDomain(row));
  }

  async findById(id: number): Promise<AutomationEmail> {
    const raw = await this.repo
      .createQueryBuilder('m')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = m.autm_status_type_id')
      .select('m.autm_id', 'autm_id')
      .addSelect('m.autm_from_email', 'autm_from_email')
      .addSelect('m.autm_to_email', 'autm_to_email')
      .addSelect('m.autm_date_received', 'autm_date_received')
      .addSelect('m.autm_subject', 'autm_subject')
      .addSelect('m.autm_departament', 'autm_departament')
      .addSelect('m.autm_city', 'autm_city')
      .addSelect('m.autm_locality', 'autm_locality')
      .addSelect('m.autm_specialty', 'autm_specialty')
      .addSelect('m.autm_process_class', 'autm_process_class')
      .addSelect('m.autm_subject_demanding', 'autm_subject_demanding')
      .addSelect('m.autm_artificial_person', 'autm_artificial_person')
      .addSelect('m.autm_document_type_1', 'autm_document_type_1')
      .addSelect('m.autm_document_number_1', 'autm_document_number_1')
      .addSelect('m.autm_email_1', 'autm_email_1')
      .addSelect('m.autm_address_1', 'autm_address_1')
      .addSelect('m.autm_phone_number_1', 'autm_phone_number_1')
      .addSelect('m.autm_subject_defendant', 'autm_subject_defendant')
      .addSelect('m.autm_natural_person', 'autm_natural_person')
      .addSelect('m.autm_document_type_2', 'autm_document_type_2')
      .addSelect('m.autm_document_number_2', 'autm_document_number_2')
      .addSelect('m.autm_email_2', 'autm_email_2')
      .addSelect('m.autm_address_2', 'autm_address_2')
      .addSelect('m.autm_phone_number_2', 'autm_phone_number_2')
      .addSelect('m.autm_number_filed', 'autm_number_filed')
      .addSelect('m.autm_automation_status', 'autm_automation_status')
      .addSelect('m.autm_detail', 'autm_detail')
      .addSelect('m.autm_status_type_id', 'autm_status_type_id')
      .addSelect('m.autm_created_at', 'autm_created_at')
      .addSelect('m.autm_updated_at', 'autm_updated_at')
      .addSelect('m.autm_responsible', 'autm_responsible')
      .addSelect('st.stty_type', 'state_type_name')
      .where('m.autm_id = :id', { id })
      .getRawOne<Record<string, unknown> | undefined>();

    if (!raw) {
      throw new Error('AutomationEmail not found');
    }
    return this.rowToDomain(raw);
  }

  async findBySubjectAndDate(subject: string, dateReceived: string): Promise<AutomationEmail | null> {
    const found = await this.repo.findOne({
      where: {
        autm_subject: subject,
        autm_date_received: dateReceived,
      },
    });
    if (!found) return null;
    return this.entityToDomain(found);
  }

  async update(data: AutomationEmail): Promise<void> {
    await this.repo.update(
      { autm_id: data.autm_id },
      {
        autm_from_email: data.autm_from_email,
        autm_to_email: data.autm_to_email,
        autm_date_received: data.autm_date_received,
        autm_subject: data.autm_subject,
        autm_departament: data.autm_departament ?? null,
        autm_city: data.autm_city ?? null,
        autm_locality: data.autm_locality ?? null,
        autm_specialty: data.autm_specialty ?? null,
        autm_process_class: data.autm_process_class ?? null,
        autm_subject_demanding: data.autm_subject_demanding ?? null,
        autm_artificial_person: data.autm_artificial_person ?? null,
        autm_document_type_1: data.autm_document_type_1 ?? null,
        autm_document_number_1: data.autm_document_number_1 ?? null,
        autm_email_1: data.autm_email_1 ?? null,
        autm_address_1: data.autm_address_1 ?? null,
        autm_phone_number_1: data.autm_phone_number_1 ?? null,
        autm_subject_defendant: data.autm_subject_defendant ?? null,
        autm_natural_person: data.autm_natural_person ?? null,
        autm_document_type_2: data.autm_document_type_2 ?? null,
        autm_document_number_2: data.autm_document_number_2 ?? null,
        autm_email_2: data.autm_email_2 ?? null,
        autm_address_2: data.autm_address_2 ?? null,
        autm_phone_number_2: data.autm_phone_number_2 ?? null,
        autm_number_filed: data.autm_number_filed ?? null,
        autm_automation_status: data.autm_automation_status,
        autm_detail: data.autm_detail ?? null,
        autm_status_type_id: data.autm_status_type_id,
        autm_responsible: data.autm_responsible,
        autm_updated_at: data.autm_updated_at,
      },
    );
  }

  async findOpciones(): Promise<{ autm_automation_status: string }[]> {
    const raw = await this.repo
      .createQueryBuilder('m')
      .select('DISTINCT m.autm_automation_status', 'autm_automation_status')
      .orderBy('m.autm_automation_status', 'ASC')
      .getRawMany<{ autm_automation_status: string }>();
    return raw;
  }

  async findOpcionesActivas(): Promise<{ autm_automation_status: string }[]> {
    const raw = await this.repo
      .createQueryBuilder('m')
      .innerJoin(TblStateTypeEntity, 'st', 'st.stty_id = m.autm_status_type_id')
      .select('DISTINCT m.autm_automation_status', 'autm_automation_status')
      .where('LOWER(st.stty_type) NOT LIKE :pattern', { pattern: '%inactiv%' })
      .orderBy('m.autm_automation_status', 'ASC')
      .getRawMany<{ autm_automation_status: string }>();
    return raw;
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete({ autm_id: id });
  }

  private rowToDomain(row: Record<string, unknown>): AutomationEmail {
    return {
      autm_id: row.autm_id as number,
      autm_from_email: row.autm_from_email as string,
      autm_to_email: row.autm_to_email as string,
      autm_date_received: row.autm_date_received as string,
      autm_subject: row.autm_subject as string,
      autm_departament: (row.autm_departament as string) ?? null,
      autm_city: (row.autm_city as string) ?? null,
      autm_locality: (row.autm_locality as string) ?? null,
      autm_specialty: (row.autm_specialty as string) ?? null,
      autm_process_class: (row.autm_process_class as string) ?? null,
      autm_subject_demanding: (row.autm_subject_demanding as string) ?? null,
      autm_artificial_person: (row.autm_artificial_person as string) ?? null,
      autm_document_type_1: (row.autm_document_type_1 as string) ?? null,
      autm_document_number_1: (row.autm_document_number_1 as string) ?? null,
      autm_email_1: (row.autm_email_1 as string) ?? null,
      autm_address_1: (row.autm_address_1 as string) ?? null,
      autm_phone_number_1: (row.autm_phone_number_1 as string) ?? null,
      autm_subject_defendant: (row.autm_subject_defendant as string) ?? null,
      autm_natural_person: (row.autm_natural_person as string) ?? null,
      autm_document_type_2: (row.autm_document_type_2 as string) ?? null,
      autm_document_number_2: (row.autm_document_number_2 as string) ?? null,
      autm_email_2: (row.autm_email_2 as string) ?? null,
      autm_address_2: (row.autm_address_2 as string) ?? null,
      autm_phone_number_2: (row.autm_phone_number_2 as string) ?? null,
      autm_number_filed: (row.autm_number_filed as string) ?? null,
      autm_automation_status: row.autm_automation_status as string,
      autm_detail: (row.autm_detail as string) ?? null,
      autm_status_type_id: row.autm_status_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      autm_created_at: row.autm_created_at as Date,
      autm_updated_at: row.autm_updated_at as Date,
      autm_responsible: row.autm_responsible as string,
    };
  }

  private entityToDomain(entity: AutomationEmailEntity): AutomationEmail {
    return {
      autm_id: entity.autm_id,
      autm_from_email: entity.autm_from_email,
      autm_to_email: entity.autm_to_email,
      autm_date_received: entity.autm_date_received,
      autm_subject: entity.autm_subject,
      autm_departament: entity.autm_departament ?? null,
      autm_city: entity.autm_city ?? null,
      autm_locality: entity.autm_locality ?? null,
      autm_specialty: entity.autm_specialty ?? null,
      autm_process_class: entity.autm_process_class ?? null,
      autm_subject_demanding: entity.autm_subject_demanding ?? null,
      autm_artificial_person: entity.autm_artificial_person ?? null,
      autm_document_type_1: entity.autm_document_type_1 ?? null,
      autm_document_number_1: entity.autm_document_number_1 ?? null,
      autm_email_1: entity.autm_email_1 ?? null,
      autm_address_1: entity.autm_address_1 ?? null,
      autm_phone_number_1: entity.autm_phone_number_1 ?? null,
      autm_subject_defendant: entity.autm_subject_defendant ?? null,
      autm_natural_person: entity.autm_natural_person ?? null,
      autm_document_type_2: entity.autm_document_type_2 ?? null,
      autm_document_number_2: entity.autm_document_number_2 ?? null,
      autm_email_2: entity.autm_email_2 ?? null,
      autm_address_2: entity.autm_address_2 ?? null,
      autm_phone_number_2: entity.autm_phone_number_2 ?? null,
      autm_number_filed: entity.autm_number_filed ?? null,
      autm_automation_status: entity.autm_automation_status,
      autm_detail: entity.autm_detail ?? null,
      autm_status_type_id: entity.autm_status_type_id,
      autm_created_at: entity.autm_created_at,
      autm_updated_at: entity.autm_updated_at,
      autm_responsible: entity.autm_responsible,
    };
  }
}
