import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteRelationshipDto {
  // TODO: remove ApiProperty once wrapper with generic DTO is introduced
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID(4)
  public readonly id: string;
}
