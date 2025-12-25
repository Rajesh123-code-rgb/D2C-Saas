import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { SecretsService } from './secrets.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Secret } from './secrets.entity';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Secret])],
    providers: [EncryptionService, SecretsService],
    exports: [EncryptionService, SecretsService],
})
export class SecurityModule { }
