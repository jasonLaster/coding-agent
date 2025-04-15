import Anthropic from "@anthropic-ai/sdk";
import { Message, MessageParam } from "@anthropic-ai/sdk/resources";
import readline from "node:readline";
import {
  ToolDefinition,
  readFileTool,
  editFileTool,
  listFilesTool,
} from "./tools";
import { logger as JSONLogger } from "./logger";

import { initLogger, traced } from "braintrust";

initLogger({
  projectName: "code-agent",
  apiKey: process.env.BRAINTRUST_API_KEY,
});

export class Agent {
  private client: Anthropic;
  private tools: ToolDefinition[];
  private toolsMap: Record<string, ToolDefinition>;
  private rl: readline.Interface;
  private isRunning: boolean = false;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.tools = [readFileTool, listFilesTool, editFileTool];

    this.toolsMap = {};
    for (const tool of this.tools) {
      this.toolsMap[tool.name] = tool;
    }

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async getUserMessage(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question("You: ", (answer: string) => {
        resolve(answer);
      });
    });
  }

  async runInference(
    conversation: MessageParam[]
  ): Promise<[MessageParam[], Message]> {
    return traced(async (span) => {
      const tools = this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object" as const,
          properties: tool.input_schema.properties || {},
          required: tool.input_schema.required || [],
        },
      }));

      const response = await this.client.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1024,
        messages: conversation,
        tools,
      });

      if (response.stop_reason == "tool_use") {
        conversation.push({ role: "assistant", content: response.content });
        const validResults = await Promise.all(
          response.content
            .filter((content) => content.type == "tool_use")
            .map(async (content) => {
              try {
                const result = await this.toolsMap[content.name].function(
                  content.input
                );

                JSONLogger.log({
                  event: "tool_usage",
                  tool: content.name,
                  input: content.input,
                  result: result,
                });

                span.log({
                  input: content.input,
                  output: result,
                  metadata: {
                    tool: content.name,
                  },
                });

                return {
                  type: "tool_result" as const,
                  tool_use_id: content.id,
                  content: result,
                };
              } catch (error: any) {
                JSONLogger.log({
                  event: "tool_error",
                  tool: content.name,
                  input: content.input,
                  error: error.message,
                });

                return {
                  type: "tool_result" as const,
                  tool_use_id: content.id,
                  content: `Error: ${error.message}`,
                };
              }
            })
        );

        conversation.push({ role: "user", content: validResults });
        return this.runInference(conversation);
      }

      return [conversation, response];
    });
  }

  async run(): Promise<void> {
    await traced(async (span: any) => {
      console.log(
        "Welcome to the JS Coding Agent! Type your message. (Ctrl+C to exit)"
      );
      JSONLogger.log({ event: "session_start" });

      // Set up signal handler for graceful shutdown
      this.isRunning = true;
      process.on("SIGINT", () => {
        console.log("\nGracefully shutting down...");
        JSONLogger.log({ event: "session_end", reason: "SIGINT" });
        this.isRunning = false;
        this.rl.close();
        throw "Shutting down";
      });

      const conversation: MessageParam[] = [];
      while (this.isRunning) {
        const userMsg = await this.getUserMessage();
        if (!this.isRunning) break; // Check if we've been interrupted during input

        JSONLogger.log({ event: "user_input", message: userMsg });

        const input = { role: "user", content: userMsg };
        conversation.push(input);
        try {
          const [_, response] = await this.runInference(conversation);

          // Extract text content from the response
          const responseText = response.content
            .filter((content) => content.type === "text")
            .map((content) => content.text)
            .join("\n");

          span.log({ input, response: responseText });

          console.log(`Agent: ${responseText}`);
          JSONLogger.log({ event: "agent_response", message: responseText });
        } catch (err: any) {
          console.error(`Error: ${err.message}`);
          JSONLogger.log({ event: "error", message: err.message });
        }
      }
    });
  }
}
