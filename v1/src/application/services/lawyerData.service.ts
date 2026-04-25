// Responsabilidad: servicio de aplicación para lawyer_data.

import {
  UnprocessableEntityException,
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
import { TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/tblPortfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblPortfolioTypeId } from '@domain/value-objects/tblPortfolioType.valueobjects';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class LawyerDataService {
  constructor(
    @Inject(LAWYER_DATA_REPOSITORY)
    private readonly lawyerDataRepository: LawyerDataRepository,
    @Inject(TBL_PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: TblPortfolioTypeRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
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
      throw new ConflictException({ message: userMsg.documentoRegistroDuplicado });
    }

    try {
      return await this.lawyerDataRepository.create(normalized);
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(): Promise<LawyerData[]> {
    try {
      return await this.lawyerDataRepository.findAll();
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
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
        portfolio_type_name: portfolio.porty_type,
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
        state_type_name: stateType.stty_type,
        created_at: lawyer.created_at,
        updated_at: lawyer.updated_at,
        responsible: lawyer.responsible,
      };
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
  }

  async update(lawyer: LawyerData): Promise<LawyerData> {
    try {
      TblPortfolioTypeId.create(lawyer.portfolio_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idCarteraEntero);
    }

    try {
      TblStateTypeId.create(lawyer.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    let existing: LawyerData;
    try {
      existing = await this.lawyerDataRepository.findById(lawyer.id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
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
      throw new UnprocessableEntityException({ message: userMsg.sinCambios });
    }

    try {
      return await this.lawyerDataRepository.update(normalized);
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.lawyerDataRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    try {
      await this.lawyerDataRepository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}

