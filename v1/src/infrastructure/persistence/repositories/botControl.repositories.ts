// Responsabilidad: implementación concreta de BotControlRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BotControl } from '@domain/entities/botControl.entities';
import {
  BotControlRepository,
  UpsertBotControlInput,
} from '@domain/ports/botControl.ports';
import { BotControlEntity } from '../entities/botControl.entities';

@Injectable()
export class BotControlRepositoryImpl implements BotControlRepository {
  private readonly repo: Repository<BotControlEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(BotControlEntity);
  }

  private toDomain(entity: BotControlEntity): BotControl {
    return {
      id: entity.id,
      data_bases_id: entity.data_bases_id,
      running: !!entity.running,
      last_started_at: entity.last_started_at,
      last_stopped_at: entity.last_stopped_at,
      reason: entity.reason,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      responsible: entity.responsible,
    };
  }

  async upsertForDataBases(input: UpsertBotControlInput): Promise<BotControl> {
    const now = new Date();
    const existing = await this.repo.findOne({
      where: { data_bases_id: input.data_bases_id },
    });

    const entity: BotControlEntity = existing ?? new BotControlEntity();
    entity.data_bases_id = input.data_bases_id;
    entity.running = input.running;
    entity.reason =
      input.reason ??
      existing?.reason ??
      (input.running ? 'Bot en ejecución' : 'Bot detenido');
    entity.responsible = input.responsible ?? existing?.responsible ?? 'BOT ctrl filed demand';
    entity.created_at = existing?.created_at ?? input.created_at ?? now;
    entity.updated_at = input.updated_at ?? now;

    if (input.running) {
      entity.last_started_at = input.last_started_at ?? now;
    } else {
      entity.last_stopped_at = input.last_stopped_at ?? now;
    }

    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findByDataBasesId(data_bases_id: number): Promise<BotControl | null> {
    const entity = await this.repo.findOne({ where: { data_bases_id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<BotControl[]> {
    const list = await this.repo.find({ order: { id: 'DESC' } });
    return list.map((e) => this.toDomain(e));
  }

  async findRunningIds(): Promise<number[]> {
    const rows = await this.repo
      .createQueryBuilder('bc')
      .select(['bc.data_bases_id'])
      .where('bc.running = :running', { running: 1 })
      .getRawMany<{ bc_data_bases_id: number }>();
    return rows.map((r) => r.bc_data_bases_id);
  }
}

