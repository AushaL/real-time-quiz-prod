import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QueueModule } from "../queue/queue.module";
import { RedisModule } from "../redis/redis.module";
import { GameCoordinatorService } from "./game-coordinator.service";
import { RealtimeBusService } from "./realtime-bus.service";
import { RealtimeGateway } from "./realtime.gateway";
import { RoomService } from "./room.service";

@Module({
  imports: [AuthModule, RedisModule, QueueModule],
  providers: [
    RoomService,
    RealtimeBusService,
    GameCoordinatorService,
    RealtimeGateway,
  ],
  exports: [GameCoordinatorService],
})
export class RealtimeModule {}
