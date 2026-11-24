import type { CloudinaryService } from "../media/cloudinary.service";
import type { GameCoordinatorService } from "../realtime/game-coordinator.service";
import { JobsService } from "./jobs.service";
import type { LocalJobHandler, QueueService } from "../queue/queue.service";

describe("JobsService", () => {
  const setLocalHandler = jest.fn();
  const queue = { setLocalHandler } as unknown as QueueService;

  const handleQuestionTimeout = jest.fn().mockResolvedValue(undefined);
  const handleAdvance = jest.fn().mockResolvedValue(undefined);
  const coordinator = {
    handleQuestionTimeout,
    handleAdvance,
  } as unknown as GameCoordinatorService;

  const destroy = jest.fn().mockResolvedValue(undefined);
  const cloudinary = { destroy } as unknown as CloudinaryService;

  let service: JobsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JobsService(queue, coordinator, cloudinary);
  });

  it("registers itself as the local timer handler", () => {
    service.onModuleInit();
    expect(setLocalHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  it("routes question timeout jobs", async () => {
    await service.handle({
      type: "question-timeout",
      code: "ROOM01",
      questionIndex: 2,
    });
    expect(handleQuestionTimeout).toHaveBeenCalledWith("ROOM01", 2);
  });

  it("routes advance jobs", async () => {
    await service.handle({ type: "advance", code: "ROOM01", questionIndex: 1 });
    expect(handleAdvance).toHaveBeenCalledWith("ROOM01", 1);
  });

  it("deletes every media asset in a cleanup job", async () => {
    await service.handle({
      type: "media-cleanup",
      assets: [
        { publicId: "pid-1", url: "https://cdn/one.png" },
        { publicId: null, url: null },
      ],
    });

    expect(destroy).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledWith("pid-1", "https://cdn/one.png");
    expect(destroy).toHaveBeenCalledWith(null, null);
  });

  it("acks unknown jobs instead of retrying them forever", async () => {
    const handler = service.handle.bind(service);
    await expect(
      handler({ type: "unknown" } as unknown as Parameters<typeof handler>[0]),
    ).resolves.toBeUndefined();
  });

  it("exposes the same dispatcher to the queue", () => {
    service.onModuleInit();
    const handler = setLocalHandler.mock.calls[0][0] as LocalJobHandler;
    expect(handler).toBeInstanceOf(Function);
  });
});
