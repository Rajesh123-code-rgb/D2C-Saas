import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/contact.entity';
import { GdprService } from './gdpr.service';
import { GdprController } from './gdpr.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Contact]),
        AuditModule,
    ],
    providers: [GdprService],
    controllers: [GdprController],
    exports: [GdprService],
})
export class GdprModule { }
