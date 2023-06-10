import { DynamicModule, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken';

type AuthModuleOptions = {
  publicKey: string;
  issuer: string;
  audience: string;
  algorithm: string;
};

@Module({})
export class AuthModule {
  public static forRoot(options?: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        JwtModule.register({
          global: true,
          publicKey: options.publicKey,
          verifyOptions: {
            issuer: options.issuer,
            audience: options.audience,
            algorithms: [options.algorithm as Algorithm],
          },
        }),
      ],
    };
  }
}
