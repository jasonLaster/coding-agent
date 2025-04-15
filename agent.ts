import { Agent } from "./src/agent";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const agent = new Agent();
  await agent.run();
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("An unknown error occurred.");
  }
});
