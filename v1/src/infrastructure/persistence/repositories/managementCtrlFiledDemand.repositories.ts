// Responsabilidad: implementación TypeORM de ManagementCtrlFiledDemandRepository.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ManagementCtrlFiledDemand } from '@domain/entities/managementCtrlFiledDemand.entities';
import {
  CreateManagementCtrlFiledDemandInput,
  FindAllManagementCtrlFiledDemandFilters,
  ManagementCtrlFiledDemandRepository,
} from '@domain/ports/managementCtrlFiledDemand.ports';
import { ManagementCtrlFiledDemandEntity } from '../entities/managementCtrlFiledDemand.entities';
import { TblStateTypeEntity } from '../entities/stateType.entities';
import { TblPortfolioTypeEntity } from '../entities/portfolioType.entities';

@Injectable()
export class ManagementCtrlFiledDemandRepositoryImpl implements ManagementCtrlFiledDemandRepository {
  private readonly repo: Repository<ManagementCtrlFiledDemandEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(ManagementCtrlFiledDemandEntity);
  }

  async create(input: CreateManagementCtrlFiledDemandInput): Promise<ManagementCtrlFiledDemand> {
    const now = new Date();
    const entity: Partial<ManagementCtrlFiledDemandEntity> = {
      mcfd_portfolio_type_id: input.mcfd_portfolio_type_id,
      mcfd_name_data_base: input.mcfd_name_data_base,
      mcfd_lawsuit_id: input.mcfd_lawsuit_id,
      mcfd_lawsuits_filings_id: input.mcfd_lawsuits_filings_id,
      mcfd_client_id: input.mcfd_client_id,
      mcfd_automation_email_id: null,
      mcfd_last_execution: now,
      mcfd_retries: 0,
      mcfd_filing_date: input.mcfd_filing_date ? this.toDateString(input.mcfd_filing_date) : null,
      mcfd_filing_date_action: null,
      mcfd_number_filed: input.mcfd_number_filed ?? null,
      mcfd_management_status: input.mcfd_management_status,
      mcfd_detail: input.mcfd_detail ?? null,
      mcfd_state_type_id: input.mcfd_state_type_id,
      mcfd_created_at: now,
      mcfd_updated_at: now,
      mcfd_responsible: input.mcfd_responsible,
    };
    const saved = await this.repo.save(entity as ManagementCtrlFiledDemandEntity);
    return this.findById(saved.mcfd_id);
  }

  async findAll(filters: FindAllManagementCtrlFiledDemandFilters = {}): Promise<ManagementCtrlFiledDemand[]> {
    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = m.mcfd_state_type_id')
      .leftJoin(TblPortfolioTypeEntity, 'pt', 'pt.porty_id = m.mcfd_portfolio_type_id')
      .select('m.mcfd_id', 'mcfd_id')
      .addSelect('m.mcfd_portfolio_type_id', 'mcfd_portfolio_type_id')
      .addSelect('pt.porty_type', 'portfolio_type_name')
      .addSelect('m.mcfd_name_data_base', 'mcfd_name_data_base')
      .addSelect('m.mcfd_lawsuit_id', 'mcfd_lawsuit_id')
      .addSelect('m.mcfd_lawsuits_filings_id', 'mcfd_lawsuits_filings_id')
      .addSelect('m.mcfd_client_id', 'mcfd_client_id')
      .addSelect('m.mcfd_automation_email_id', 'mcfd_automation_email_id')
      .addSelect('m.mcfd_last_execution', 'mcfd_last_execution')
      .addSelect('m.mcfd_retries', 'mcfd_retries')
      .addSelect('m.mcfd_filing_date', 'mcfd_filing_date')
      .addSelect('m.mcfd_filing_date_action', 'mcfd_filing_date_action')
      .addSelect('m.mcfd_number_filed', 'mcfd_number_filed')
      .addSelect('m.mcfd_management_status', 'mcfd_management_status')
      .addSelect('m.mcfd_detail', 'mcfd_detail')
      .addSelect('m.mcfd_state_type_id', 'mcfd_state_type_id')
      .addSelect('m.mcfd_created_at', 'mcfd_created_at')
      .addSelect('m.mcfd_updated_at', 'mcfd_updated_at')
      .addSelect('m.mcfd_responsible', 'mcfd_responsible')
      .addSelect('st.stty_type', 'state_type_name');

    if (filters.start_date) {
      qb.andWhere('m.mcfd_created_at >= :start_date', { start_date: filters.start_date });
    }
    if (filters.end_date) {
      qb.andWhere('m.mcfd_created_at <= :end_date', { end_date: filters.end_date });
    }
    if (filters.mcfd_portfolio_type_id !== undefined) {
      qb.andWhere('m.mcfd_portfolio_type_id = :mcfd_portfolio_type_id', { mcfd_portfolio_type_id: filters.mcfd_portfolio_type_id });
    }
    if (filters.mcfd_name_data_base) {
      qb.andWhere('m.mcfd_name_data_base = :mcfd_name_data_base', { mcfd_name_data_base: filters.mcfd_name_data_base });
    }
    if (filters.mcfd_lawsuit_id !== undefined) {
      qb.andWhere('m.mcfd_lawsuit_id = :mcfd_lawsuit_id', { mcfd_lawsuit_id: filters.mcfd_lawsuit_id });
    }
    if (filters.mcfd_lawsuits_filings_id !== undefined) {
      qb.andWhere('m.mcfd_lawsuits_filings_id = :mcfd_lawsuits_filings_id', { mcfd_lawsuits_filings_id: filters.mcfd_lawsuits_filings_id });
    }
    if (filters.mcfd_client_id !== undefined) {
      qb.andWhere('m.mcfd_client_id = :mcfd_client_id', { mcfd_client_id: filters.mcfd_client_id });
    }
    if (filters.mcfd_automation_email_id !== undefined) {
      qb.andWhere('m.mcfd_automation_email_id = :mcfd_automation_email_id', { mcfd_automation_email_id: filters.mcfd_automation_email_id });
    }
    if (filters.mcfd_number_filed) {
      qb.andWhere('m.mcfd_number_filed = :mcfd_number_filed', { mcfd_number_filed: filters.mcfd_number_filed });
    }
    if (filters.mcfd_management_status) {
      qb.andWhere('m.mcfd_management_status = :mcfd_management_status', { mcfd_management_status: filters.mcfd_management_status });
    }
    if (filters.mcfd_state_type_id !== undefined) {
      qb.andWhere('m.mcfd_state_type_id = :mcfd_state_type_id', { mcfd_state_type_id: filters.mcfd_state_type_id });
    }

    qb.orderBy('m.mcfd_id', 'DESC');
    const raw = await qb.getRawMany();
    return raw.map((row: Record<string, unknown>) => this.rowToDomain(row));
  }

  async findById(id: number): Promise<ManagementCtrlFiledDemand> {
    const raw = await this.repo
      .createQueryBuilder('m')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = m.mcfd_state_type_id')
      .leftJoin(TblPortfolioTypeEntity, 'pt', 'pt.porty_id = m.mcfd_portfolio_type_id')
      .select('m.mcfd_id', 'mcfd_id')
      .addSelect('m.mcfd_portfolio_type_id', 'mcfd_portfolio_type_id')
      .addSelect('pt.porty_type', 'portfolio_type_name')
      .addSelect('m.mcfd_name_data_base', 'mcfd_name_data_base')
      .addSelect('m.mcfd_lawsuit_id', 'mcfd_lawsuit_id')
      .addSelect('m.mcfd_lawsuits_filings_id', 'mcfd_lawsuits_filings_id')
      .addSelect('m.mcfd_client_id', 'mcfd_client_id')
      .addSelect('m.mcfd_automation_email_id', 'mcfd_automation_email_id')
      .addSelect('m.mcfd_last_execution', 'mcfd_last_execution')
      .addSelect('m.mcfd_retries', 'mcfd_retries')
      .addSelect('m.mcfd_filing_date', 'mcfd_filing_date')
      .addSelect('m.mcfd_filing_date_action', 'mcfd_filing_date_action')
      .addSelect('m.mcfd_number_filed', 'mcfd_number_filed')
      .addSelect('m.mcfd_management_status', 'mcfd_management_status')
      .addSelect('m.mcfd_detail', 'mcfd_detail')
      .addSelect('m.mcfd_state_type_id', 'mcfd_state_type_id')
      .addSelect('m.mcfd_created_at', 'mcfd_created_at')
      .addSelect('m.mcfd_updated_at', 'mcfd_updated_at')
      .addSelect('m.mcfd_responsible', 'mcfd_responsible')
      .addSelect('st.stty_type', 'state_type_name')
      .where('m.mcfd_id = :id', { id })
      .getRawOne<Record<string, unknown> | undefined>();

    if (!raw) {
      throw new Error('ManagementCtrlFiledDemand not found');
    }
    return this.rowToDomain(raw);
  }

  async findNextForEmailProcessing(portfolioTypeId: number): Promise<ManagementCtrlFiledDemand | null> {
    const found = await this.repo.findOne({
      where: [
        { mcfd_portfolio_type_id: portfolioTypeId, mcfd_management_status: 'Abierto' },
        { mcfd_portfolio_type_id: portfolioTypeId, mcfd_management_status: 'En proceso' },
        { mcfd_portfolio_type_id: portfolioTypeId, mcfd_management_status: 'Novedad correo' },
      ],
      order: { mcfd_created_at: 'ASC' },
    });
    if (!found) return null;
    return this.entityToDomain(found);
  }

  async findActiveForDemand(portfolio_type_id: number, lawsuit_id: number, lawsuits_filings_id: number): Promise<ManagementCtrlFiledDemand | null> {
    const found = await this.repo.findOne({
      where: {
        mcfd_portfolio_type_id: portfolio_type_id,
        mcfd_lawsuit_id: lawsuit_id,
        mcfd_lawsuits_filings_id: lawsuits_filings_id,
      },
    });
    if (!found || found.mcfd_management_status === 'Para control manual') return null;
    return this.entityToDomain(found);
  }

  async update(data: ManagementCtrlFiledDemand): Promise<void> {
    await this.repo.update(
      { mcfd_id: data.mcfd_id },
      {
        mcfd_portfolio_type_id: data.mcfd_portfolio_type_id,
        mcfd_name_data_base: data.mcfd_name_data_base,
        mcfd_lawsuit_id: data.mcfd_lawsuit_id,
        mcfd_lawsuits_filings_id: data.mcfd_lawsuits_filings_id,
        mcfd_client_id: data.mcfd_client_id,
        mcfd_automation_email_id: data.mcfd_automation_email_id ?? null,
        mcfd_last_execution: data.mcfd_last_execution ?? null,
        mcfd_retries: data.mcfd_retries,
        mcfd_filing_date: data.mcfd_filing_date ? this.toDateString(data.mcfd_filing_date) : null,
        mcfd_filing_date_action: data.mcfd_filing_date_action ? this.toDateString(data.mcfd_filing_date_action) : null,
        mcfd_number_filed: data.mcfd_number_filed ?? null,
        mcfd_management_status: data.mcfd_management_status,
        mcfd_detail: data.mcfd_detail ?? null,
        mcfd_state_type_id: data.mcfd_state_type_id,
        mcfd_responsible: data.mcfd_responsible,
        mcfd_updated_at: data.mcfd_updated_at,
      },
    );
  }

  async findOpciones(): Promise<{ mcfd_management_status: string }[]> {
    const raw = await this.repo
      .createQueryBuilder('m')
      .select('DISTINCT m.mcfd_management_status', 'mcfd_management_status')
      .orderBy('m.mcfd_management_status', 'ASC')
      .getRawMany<{ mcfd_management_status: string }>();
    return raw;
  }

  async findOpcionesActivas(): Promise<{ mcfd_management_status: string }[]> {
    const raw = await this.repo
      .createQueryBuilder('m')
      .innerJoin(TblStateTypeEntity, 'st', 'st.stty_id = m.mcfd_state_type_id')
      .select('DISTINCT m.mcfd_management_status', 'mcfd_management_status')
      .where('LOWER(st.stty_type) NOT LIKE :pattern', { pattern: '%inactiv%' })
      .orderBy('m.mcfd_management_status', 'ASC')
      .getRawMany<{ mcfd_management_status: string }>();
    return raw;
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete({ mcfd_id: id });
  }

  private rowToDomain(row: Record<string, unknown>): ManagementCtrlFiledDemand {
    return {
      mcfd_id: row.mcfd_id as number,
      mcfd_portfolio_type_id: row.mcfd_portfolio_type_id as number,
      portfolio_type_name: (row.portfolio_type_name as string) ?? '',
      mcfd_name_data_base: row.mcfd_name_data_base as string,
      mcfd_lawsuit_id: row.mcfd_lawsuit_id as number,
      mcfd_lawsuits_filings_id: row.mcfd_lawsuits_filings_id as number,
      mcfd_client_id: row.mcfd_client_id as number,
      mcfd_automation_email_id: (row.mcfd_automation_email_id as number) ?? null,
      mcfd_last_execution: row.mcfd_last_execution ? (row.mcfd_last_execution as Date) : null,
      mcfd_retries: (row.mcfd_retries as number) ?? 0,
      mcfd_filing_date: row.mcfd_filing_date ? new Date(row.mcfd_filing_date as string) : null,
      mcfd_filing_date_action: row.mcfd_filing_date_action ? new Date(row.mcfd_filing_date_action as string) : null,
      mcfd_number_filed: (row.mcfd_number_filed as string) ?? null,
      mcfd_management_status: row.mcfd_management_status as string,
      mcfd_detail: (row.mcfd_detail as string) ?? null,
      mcfd_state_type_id: row.mcfd_state_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      mcfd_created_at: row.mcfd_created_at as Date,
      mcfd_updated_at: row.mcfd_updated_at as Date,
      mcfd_responsible: row.mcfd_responsible as string,
    };
  }

  private entityToDomain(entity: ManagementCtrlFiledDemandEntity): ManagementCtrlFiledDemand {
    return {
      mcfd_id: entity.mcfd_id,
      mcfd_portfolio_type_id: entity.mcfd_portfolio_type_id,
      mcfd_name_data_base: entity.mcfd_name_data_base,
      mcfd_lawsuit_id: entity.mcfd_lawsuit_id,
      mcfd_lawsuits_filings_id: entity.mcfd_lawsuits_filings_id,
      mcfd_client_id: entity.mcfd_client_id,
      mcfd_automation_email_id: entity.mcfd_automation_email_id ?? null,
      mcfd_last_execution: entity.mcfd_last_execution ?? null,
      mcfd_retries: entity.mcfd_retries ?? 0,
      mcfd_filing_date: entity.mcfd_filing_date ? new Date(entity.mcfd_filing_date) : null,
      mcfd_filing_date_action: entity.mcfd_filing_date_action ? new Date(entity.mcfd_filing_date_action) : null,
      mcfd_number_filed: entity.mcfd_number_filed ?? null,
      mcfd_management_status: entity.mcfd_management_status,
      mcfd_detail: entity.mcfd_detail ?? null,
      mcfd_state_type_id: entity.mcfd_state_type_id,
      mcfd_created_at: entity.mcfd_created_at,
      mcfd_updated_at: entity.mcfd_updated_at,
      mcfd_responsible: entity.mcfd_responsible,
    };
  }

  private toDateString(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date.slice(0, 10);
    return date.toISOString().slice(0, 10);
  }
}
