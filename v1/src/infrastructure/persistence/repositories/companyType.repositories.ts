// Responsabilidad: implementación concreta de CompanyTypeRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CompanyTypeEntity } from '../entities/companyType.entities';
import { CompanyType } from '@domain/entities/companyType.entities';
import { CreateCompanyTypeInput, CompanyTypeRepository } from '@domain/ports/companyType.ports';
import { TblPortfolioTypeEntity } from '../entities/tblPortfolioType.entities';
import { TblStateTypeEntity } from '../entities/tblStateType.entities';

@Injectable()
export class CompanyTypeRepositoryImpl implements CompanyTypeRepository {
  private readonly companyTypeRepository: Repository<CompanyTypeEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.companyTypeRepository = dataSource.getRepository(CompanyTypeEntity);
  }

  // Crear un nuevo registro en company_type
  async create(data: CreateCompanyTypeInput): Promise<CompanyType> {
    const now = new Date();
    const entity: Partial<CompanyTypeEntity> = {
      ...data,
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
      responsible: 'BOT ctrl filed demand',
    };
    const saved = await this.companyTypeRepository.save(entity as CompanyTypeEntity);
    return saved;
  }

  // Buscar duplicado por combinación (portfolio_type_id + campaings_format + document_number); devuelve null si no existe
  async findByDuplicate(
    portfolio_type_id: number,
    campaings_format: number,
    document_number: string,
  ): Promise<CompanyType | null> {
    const existing = await this.companyTypeRepository.findOne({
      where: { portfolio_type_id, campaings_format, document_number },
    });
    return (existing as CompanyType) ?? null;
  }

  // Obtener el primer registro por combinación (portfolio_type_id + campaings_format)
  async findFirstByPortfolioAndFormat(
    portfolio_type_id: number,
    campaings_format: number,
  ): Promise<CompanyType | null> {
    const found = await this.companyTypeRepository.findOne({
      where: { portfolio_type_id, campaings_format },
      order: { id: 'ASC' },
    });
    return (found as CompanyType) ?? null;
  }

  // Obtener todos los registros, incluyendo nombres de cartera y de estado
  async findAll(): Promise<CompanyType[]> {
    const raw = await this.companyTypeRepository
      .createQueryBuilder('ct')
      .leftJoin(TblPortfolioTypeEntity, 'pt', 'pt.id = ct.portfolio_type_id')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = ct.state_type_id')
      .select([
        'ct.id',
        'ct.portfolio_type_id',
        'ct.campaings_format',
        'ct.document_type',
        'ct.document_name',
        'ct.document_number',
        'ct.company_name',
        'ct.address',
        'ct.contact_number',
        'ct.email_notifications',
        'ct.detail',
        'ct.state_type_id',
        'ct.created_at',
        'ct.updated_at',
        'ct.responsible',
      ])
      .addSelect('pt.type', 'portfolio_type_name')
      .addSelect('st.stty_type', 'state_type_name')
      .orderBy('ct.id', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => ({
      id: row.ct_id,
      portfolio_type_id: row.ct_portfolio_type_id,
      portfolio_type_name: (row.portfolio_type_name ?? '') as string,
      campaings_format: row.ct_campaings_format,
      document_type: row.ct_document_type,
      document_name: row.ct_document_name,
      document_number: row.ct_document_number,
      company_name: row.ct_company_name,
      address: row.ct_address,
      contact_number: row.ct_contact_number,
      email_notifications: row.ct_email_notifications,
      detail: row.ct_detail,
      state_type_id: row.ct_state_type_id,
      state_type_name: (row.state_type_name ?? '') as string,
      created_at: row.ct_created_at,
      updated_at: row.ct_updated_at,
      responsible: row.ct_responsible,
    })) as CompanyType[];
  }

  // Obtener un registro por id
  async findById(id: number): Promise<CompanyType> {
    const found = await this.companyTypeRepository.findOne({ where: { id } });
    if (!found) {
      throw new Error('Company type not found');
    }
    return found as CompanyType;
  }

  // Actualizar un registro
  async update(data: CompanyType): Promise<CompanyType> {
    return (await this.companyTypeRepository.save(data)) as CompanyType;
  }

  // Eliminar un registro
  async delete(id: number): Promise<void> {
    await this.companyTypeRepository.delete(id);
  }
}

