import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { User } from '../users/user.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
    imports: [TypeOrmModule.forFeature([Tenant, User])],
    controllers: [TenantsController],
    providers: [TenantsService],
    exports: [TypeOrmModule, TenantsService],
})
export class TenantsModule { }
