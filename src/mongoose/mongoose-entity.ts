import 'reflect-metadata';
import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { Entity, uuid } from '../core';

export class MongooseEntity implements Entity {
  @Prop({ required: true, default: uuid })
  public readonly _id: string;
  // These are just dummy methods for transformation
  public set id(v: string) {}
  @Expose()
  @ApiProperty({ description: 'The UUID of the resource' })
  public get id(): string {
    return this._id;
  }

  @Expose()
  @ApiProperty({ description: 'The UUID of the user who created the resource' })
  @Prop({ required: true })
  public readonly createdBy: string;
  // Generated by mongodb
  @Expose()
  @ApiProperty({ description: 'The time when the resource was created' })
  public readonly createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'The UUID of the user who last updated the resource',
  })
  @Prop({ required: true })
  public readonly updatedBy: string;
  // Generated by mongodb
  @Expose()
  @ApiProperty({ description: 'The time when the resource was last updated' })
  public readonly updatedAt: Date;
}