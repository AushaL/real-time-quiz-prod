import { IsOptional, IsString } from "class-validator";

/**
 * The frontend still posts Clerk profile fields. `id` is accepted for
 * compatibility but ignored: the player is keyed by the token's `sub`.
 */
export class AuthCallbackDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
