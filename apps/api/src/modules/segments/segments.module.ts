import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Segment } from './segment.entity';
import { SegmentsService } from './segments.service';
import { SegmentsController } from './segments.controller';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Segment]),
        forwardRef(() => ContactsModule),
    ],
    providers: [SegmentsService],
    controllers: [SegmentsController],
    exports: [SegmentsService],
})
export class SegmentsModule { }
