// Responsabilidad: fachada de aplicación para company_type que usará el controller.

import {
  UnprocessableEntityException,
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
import { TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/tblPortfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblPortfolioTypeId } from '@domain/value-objects/tblPortfolioType.valueobjects';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class CompanyTypeService {
  constructor(
    @Inject(COMPANY_TYPE_REPOSITORY)
    private readonly companyTypeRepository: CompanyTypeRepository,
    @Inject(TBL_PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: TblPortfolioTypeRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
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
      TblPortfolioTypeId.create(input.portfolio_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idCarteraEntero);
    }

    // Validar state_type_id
    try {
      TblStateTypeId.create(input.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    // Verificar existencia de portfolio_type
    try {
      await this.portfolioTypeRepository.findById(input.portfolio_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.notFoundCartera });
    }

    // Verificar existencia de state_type
    try {
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.notFoundEstado });
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
      throw new ConflictException({ message: userMsg.documentoRegistroDuplicado });
    }

    try {
      return await this.companyTypeRepository.create(normalized);
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  // Obtener todos los registros
  async findAll(): Promise<CompanyType[]> {
    try {
      return await this.companyTypeRepository.findAll();
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noListar);
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
        portfolio_type_name: portfolio.porty_type,
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
        state_type_name: stateType.stty_type,
        created_at: company.created_at,
        updated_at: company.updated_at,
        responsible: company.responsible,
      };
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
  }

  // Actualizar un registro
  async update(company: CompanyType): Promise<CompanyType> {
    // Validar ids
    try {
      TblPortfolioTypeId.create(company.portfolio_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idCarteraEntero);
    }

    try {
      TblStateTypeId.create(company.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    // Verificar existencia
    let existing: CompanyType;
    try {
      existing = await this.companyTypeRepository.findById(company.id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
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
      throw new UnprocessableEntityException({ message: userMsg.sinCambios });
    }

    try {
      return await this.companyTypeRepository.update(normalized);
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  // Eliminar un registro
  async delete(id: number): Promise<void> {
    try {
      await this.companyTypeRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    try {
      await this.companyTypeRepository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}

