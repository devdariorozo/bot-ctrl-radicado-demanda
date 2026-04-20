// Responsabilidad: servicio de aplicación para lawyer_data.

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LawyerData } from '@domain/entities/lawyerData.entities';
import {
  LAWYER_DATA_REPOSITORY,
  LawyerDataRepository,
  CreateLawyerDataInput,
} from '@domain/ports/lawyerData.ports';
import { PORTFOLIO_TYPE_REPOSITORY, PortfolioTypeRepository } from '@domain/ports/portfolioType.ports';
import { STATE_TYPE_REPOSITORY, StateTypeRepository } from '@domain/ports/stateType.ports';
import { PortfolioTypeId } from '@domain/value-objects/portfolioType.valueobjects';
import { StateTypeId } from '@domain/value-objects/stateType.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class LawyerDataService {
  constructor(
    @Inject(LAWYER_DATA_REPOSITORY)
    private readonly lawyerDataRepository: LawyerDataRepository,
    @Inject(PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: PortfolioTypeRepository,
    @Inject(STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: StateTypeRepository,
  ) {}

  private normalizeUpper(value: string | undefined): string {
    if (value == null || typeof value !== 'string') return value as unknown as string;
    const trimmed = value.trim();
    if (trimmed.length === 0) return trimmed;
    return trimmed.toUpperCase();
  }

  private normalizeDetail(detail: string): string {
    return capitalizeFirstWord(detail);
  }

  private normalizeResponsible(): string {
    return 'BOT ctrl filed demand';
  }

  async create(input: CreateLawyerDataInput): Promise<LawyerData> {
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

    const normalized: CreateLawyerDataInput = {
      ...input,
      document_type: this.normalizeUpper(input.document_type),
      document_name: this.normalizeUpper(input.document_name ?? 'CÉDULA DE CIUDADANÍA'),
      first_name: this.normalizeUpper(input.first_name),
      second_name: this.normalizeUpper(input.second_name),
      first_last_name: this.normalizeUpper(input.first_last_name),
      second_last_name: this.normalizeUpper(input.second_last_name),
      address: this.normalizeUpper(input.address),
      email_notifications: this.normalizeUpper(input.email_notifications),
      detail: this.normalizeDetail(input.detail),
      responsible: this.normalizeResponsible(),
    };

    // Duplicado por portfolio_type_id + document_type + document_number
    const duplicate = await this.lawyerDataRepository.findByDuplicate(
      normalized.portfolio_type_id,
      normalized.document_type,
      normalized.document_number,
    );
    if (duplicate) {
      throw new ConflictException('Lawyer data with the same document already exists');
    }

    try {
      return await this.lawyerDataRepository.create(normalized);
    } catch (error) {
      throw new InternalServerErrorException('Error creating lawyer data');
    }
  }

  async findAll(): Promise<LawyerData[]> {
    try {
      return await this.lawyerDataRepository.findAll();
    } catch {
      throw new InternalServerErrorException('Error getting all lawyer data');
    }
  }

  async findById(id: number): Promise<LawyerData> {
    try {
      const lawyer = await this.lawyerDataRepository.findById(id);
      const portfolio = await this.portfolioTypeRepository.findById(lawyer.portfolio_type_id);
      const stateType = await this.stateTypeRepository.findById(lawyer.state_type_id);

      return {
        id: lawyer.id,
        portfolio_type_id: lawyer.portfolio_type_id,
        portfolio_type_name: portfolio.type,
        document_type: lawyer.document_type,
        document_name: lawyer.document_name,
        document_number: lawyer.document_number,
        first_name: lawyer.first_name,
        second_name: lawyer.second_name,
        first_last_name: lawyer.first_last_name,
        second_last_name: lawyer.second_last_name,
        address: lawyer.address,
        contact_number: lawyer.contact_number,
        email_notifications: lawyer.email_notifications,
        detail: lawyer.detail,
        state_type_id: lawyer.state_type_id,
        state_type_name: stateType.type,
        created_at: lawyer.created_at,
        updated_at: lawyer.updated_at,
        responsible: lawyer.responsible,
      };
    } catch {
      throw new NotFoundException('No data found for the given id');
    }
  }

  async update(lawyer: LawyerData): Promise<LawyerData> {
    try {
      PortfolioTypeId.create(lawyer.portfolio_type_id);
    } catch {
      throw new BadRequestException('portfolio_type_id must be a positive integer');
    }

    try {
      StateTypeId.create(lawyer.state_type_id);
    } catch {
      throw new BadRequestException('state_type_id must be a positive integer');
    }

    let existing: LawyerData;
    try {
      existing = await this.lawyerDataRepository.findById(lawyer.id);
    } catch {
      throw new NotFoundException('No data found for the given id');
    }

    const normalized: LawyerData = {
      ...lawyer,
      document_type: this.normalizeUpper(lawyer.document_type),
      document_name: this.normalizeUpper(
        lawyer.document_name ?? 'CÉDULA DE CIUDADANÍA',
      ),
      first_name: this.normalizeUpper(lawyer.first_name),
      second_name: this.normalizeUpper(lawyer.second_name),
      first_last_name: this.normalizeUpper(lawyer.first_last_name),
      second_last_name: this.normalizeUpper(lawyer.second_last_name),
      address: this.normalizeUpper(lawyer.address),
      email_notifications: this.normalizeUpper(lawyer.email_notifications),
      detail: this.normalizeDetail(lawyer.detail),
      responsible: this.normalizeResponsible(),
    };

    const hasChanges =
      existing.portfolio_type_id !== normalized.portfolio_type_id ||
      existing.document_type !== normalized.document_type ||
      existing.document_name !== normalized.document_name ||
      existing.document_number !== normalized.document_number ||
      existing.first_name !== normalized.first_name ||
      existing.second_name !== normalized.second_name ||
      existing.first_last_name !== normalized.first_last_name ||
      existing.second_last_name !== normalized.second_last_name ||
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
      return await this.lawyerDataRepository.update(normalized);
    } catch {
      throw new InternalServerErrorException('Error updating lawyer data');
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.lawyerDataRepository.findById(id);
    } catch {
      throw new NotFoundException('No data found for the given id');
    }

    try {
      await this.lawyerDataRepository.delete(id);
    } catch {
      throw new InternalServerErrorException('Error deleting lawyer data');
    }
  }
}

