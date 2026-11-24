import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { createApp } from "./bootstrap";

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 5000);

  await app.listen(port);
  Logger.log(`API is running on http://localhost:${port}/api`, "Bootstrap");
}

void bootstrap();
