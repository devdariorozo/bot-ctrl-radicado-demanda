// Responsabilidad: fachada de aplicación para company_type que usará el controller.

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CompanyType } from '@domain/entities/companyType.entities';
import {
  COMPANY_TYPE_REPOSITORY,
  CompanyTypeRepository,
  CreateCompanyTypeInput,
} from '@domain/ports/companyType.ports';
import { PORTFOLIO_TYPE_REPOSITORY, PortfolioTypeRepository } from '@domain/ports/portfolioType.ports';
import { STATE_TYPE_REPOSITORY, StateTypeRepository } from '@domain/ports/stateType.ports';
import { PortfolioTypeId } from '@domain/value-objects/portfolioType.valueobjects';
import { StateTypeId } from '@domain/value-objects/stateType.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class CompanyTypeService {
  constructor(
    @Inject(COMPANY_TYPE_REPOSITORY)
    private readonly companyTypeRepository: CompanyTypeRepository,
    @Inject(PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: PortfolioTypeRepository,
    @Inject(STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: StateTypeRepository,
  ) {}

  private normalizeDetail(detail: string): string {
    return capitalizeFirstWord(detail);
  }

  private normalizeDocumentName(document_name: string): string {
    if (document_name == null || typeof document_name !== 'string') return document_name as unknown as string;
    const trimmed = document_name.trim();
    if (trimmed.length === 0) return trimmed;
    return trimmed.toUpperCase();
  }

  private normalizeUpper(value: string): string {
    if (value == null || typeof value !== 'string') return value as unknown as string;
    const trimmed = value.trim();
    if (trimmed.length === 0) return trimmed;
    return trimmed.toUpperCase();
  }

  private normalizeEmail(value: string): string {
    if (value == null || typeof value !== 'string') return value as unknown as string;
    const trimmed = value.trim();
    if (trimmed.length === 0) return trimmed;
    return trimmed.toUpperCase();
  }

  private normalizeResponsible(): string {
    return 'BOT ctrl filed demand';
  }

  // Crear un nuevo registro en company_type
  async create(input: CreateCompanyTypeInput): Promise<CompanyType> {
    // Validar portfolio_type_id
    try {
      PortfolioTypeId.create(input.portfolio_type_id);
    } catch {
      throw new BadRequestException('portfolio_type_id must be a positive integer');
    }

    // Validar state_type_id
    try {
      StateTypeId.create(input.state_type_id);
    } catch {
      throw new BadRequestException('state_type_id must be a positive integer');
    }

    // Verificar existencia de portfolio_type
    try {
      await this.portfolioTypeRepository.findById(input.portfolio_type_id);
    } catch {
      throw new NotFoundException('No data found for the given portfolio type id');
    }

    // Verificar existencia de state_type
    try {
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException('No data found for the given state type id');
    }

    // Normalizar campos
    const normalized: CreateCompanyTypeInput = {
      ...input,
      detail: this.normalizeDetail(input.detail),
      document_type: (input.document_type ?? '').toUpperCase().trim(),
      document_name: this.normalizeDocumentName(
        input.document_name ?? 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
      ),
      company_name: this.normalizeUpper(input.company_name),
      address: this.normalizeUpper(input.address),
      email_notifications: this.normalizeEmail(input.email_notifications),
      responsible: this.normalizeResponsible(),
    };

    // Verificar duplicado por combinación (portfolio_type_id + campaings_format + document_number)
    const duplicate = await this.companyTypeRepository.findByDuplicate(
      normalized.portfolio_type_id,
      normalized.campaings_format,
      normalized.document_number,
    );
    if (duplicate) {
      throw new ConflictException('Company with the same document already exists');
    }

    try {
      return await this.companyTypeRepository.create(normalized);
    } catch (error) {
      throw new InternalServerErrorException('Error creating company type');
    }
  }

  // Obtener todos los registros
  async findAll(): Promise<CompanyType[]> {
    try {
      return await this.companyTypeRepository.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Error getting all company types');
    }
  }

  // Obtener un registro por id
  async findById(id: number): Promise<CompanyType> {
    try {
      const company = await this.companyTypeRepository.findById(id);
      const portfolio = await this.portfolioTypeRepository.findById(company.portfolio_type_id);
      const stateType = await this.stateTypeRepository.findById(company.state_type_id);

      return {
        id: company.id,
        portfolio_type_id: company.portfolio_type_id,
        portfolio_type_name: portfolio.type,
        campaings_format: company.campaings_format,
        document_type: company.document_type,
        document_name: company.document_name,
        document_number: company.document_number,
        company_name: company.company_name,
        address: company.address,
        contact_number: company.contact_number,
        email_notifications: company.email_notifications,
        detail: company.detail,
        state_type_id: company.state_type_id,
        state_type_name: stateType.type,
        created_at: company.created_at,
        updated_at: company.updated_at,
        responsible: company.responsible,
      };
    } catch {
      throw new NotFoundException('No data found for the given id');
    }
  }

  // Actualizar un registro
  async update(company: CompanyType): Promise<CompanyType> {
    // Validar ids
    try {
      PortfolioTypeId.create(company.portfolio_type_id);
    } catch {
      throw new BadRequestException('portfolio_type_id must be a positive integer');
    }

    try {
      StateTypeId.create(company.state_type_id);
    } catch {
      throw new BadRequestException('state_type_id must be a positive integer');
    }

    // Verificar existencia
    let existing: CompanyType;
    try {
      existing = await this.companyTypeRepository.findById(company.id);
    } catch {
      throw new NotFoundException('No data found for the given id');
    }

    const normalized: CompanyType = {
      ...company,
      detail: this.normalizeDetail(company.detail),
      document_type: (company.document_type ?? '').toUpperCase().trim(),
      document_name: this.normalizeDocumentName(company.document_name),
      company_name: this.normalizeUpper(company.company_name),
      address: this.normalizeUpper(company.address),
      email_notifications: this.normalizeEmail(company.email_notifications),
      responsible: this.normalizeResponsible(),
    };

    const hasChanges =
      existing.portfolio_type_id !== normalized.portfolio_type_id ||
      existing.campaings_format !== normalized.campaings_format ||
      existing.document_type !== normalized.document_type ||
      existing.document_number !== normalized.document_number ||
      existing.company_name !== normalized.company_name ||
      existing.address !== normalized.address ||
      existing.contact_number !== normalized.contact_number ||
      existing.email_notifications !== normalized.email_notifications ||
      existing.detail !== normalized.detail ||
      existing.state_type_id !== normalized.state_type_id ||
      existing.responsible !== normalized.responsible;

    if (!hasChanges) {
      throw new BadRequestException('No changes to update');
    }

    try {
      return await this.companyTypeRepository.update(normalized);
    } catch (error) {
      throw new InternalServerErrorException('Error updating company type');
    }
  }

  // Eliminar un registro
  async delete(id: number): Promise<void> {
    try {
      await this.companyTypeRepository.findById(id);
    } catch {
      throw new NotFoundException('No data found for the given id');
    }

    try {
      await this.companyTypeRepository.delete(id);
    } catch {
      throw new InternalServerErrorException('Error deleting company type');
    }
  }
}

