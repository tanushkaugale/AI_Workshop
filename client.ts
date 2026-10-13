import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";

async function main() {
  // 1. Check the OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing from .env");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 2. Create terminal input interface
  const rl = readline.createInterface({
    input,
    output,
  });

  // 3. Configure the MCP server process
  const command = process.platform === "win32" ? "npx.cmd" : "npx";

  const transport = new StdioClientTransport({
    command,
    args: ["tsx", "server.ts"],
  });

  // 4. Create the MCP client
  const client = new Client(
    {
      name: "sanjivani-ai-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    console.log("\n========================================");
    console.log("   SANJIVANI AI FARMER ASSISTANT");
    console.log("========================================\n");

    // 5. Connect to the MCP server
    console.log("Connecting to MCP server...");

    await client.connect(transport);

    console.log("MCP client connected successfully.");

    // 6. Discover available MCP tools
    const toolList = await client.listTools();

    console.log("\nAvailable MCP tools:");

    toolList.tools.forEach((tool) => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });

    // 7. Convert MCP tools into OpenAI function tools
    const tools = toolList.tools.map((tool) => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema as Record<string, unknown>,
      strict: false,
    }));

    // 8. Keep accepting questions until the user exits
    while (true) {
      const question = (
        await rl.question(
          "\nAsk your question (or type 'exit' to quit): "
        )
      ).trim();

      if (!question) {
        console.log("Please enter a question.");
        continue;
      }

      if (question.toLowerCase() === "exit") {
        console.log("\nThank you for using Sanjivani AI Farmer Assistant!");
        break;
      }

      try {
        console.log("\nAI is processing your question...\n");

        // 9. Send the user's question to OpenAI
        let response = await openai.responses.create({
          model: "gpt-4.1-mini",
          instructions:
            "You are an AI management assistant for Sanjivani Sugar Factory. Use the available MCP tool to retrieve farmer records before answering questions about the database. Do not invent farmer names, villages, supply quantities, or payment amounts. Use only the retrieved database records for factual answers. Calculate comparisons and totals from the retrieved records when needed. If the requested information is unavailable, explain that clearly.",
          input: question,
          tools,
        });

        // 10. Execute requested MCP tool calls
        while (true) {
          const toolCalls = response.output.filter(
            (item) => item.type === "function_call"
          );

          // OpenAI has generated its final answer
          if (toolCalls.length === 0) {
            console.log("========== AI ANSWER ==========\n");
            console.log(response.output_text);
            console.log("\n===============================\n");
            break;
          }

          const toolOutputs: Array<{
            type: "function_call_output";
            call_id: string;
            output: string;
          }> = [];

          for (const toolCall of toolCalls) {
            console.log(`Calling MCP tool: ${toolCall.name}`);

            const args: Record<string, unknown> = JSON.parse(
              toolCall.arguments
            );

            console.log("Tool arguments:", args);

            // Execute the tool through the MCP client
            const result = await client.callTool({
              name: toolCall.name,
              arguments: args,
            });

            // Read the result returned by the MCP server
            const content = result.content;

            const resultText = Array.isArray(content)
              ? content
                  .map((item: { type: string; text?: string }) =>
                    item.type === "text" ? item.text ?? "" : ""
                  )
                  .join("\n")
              : "";

            if (result.isError) {
              throw new Error(
                `MCP tool failed: ${resultText}`
              );
            }

            console.log("Database records retrieved successfully.\n");

            toolOutputs.push({
              type: "function_call_output",
              call_id: toolCall.call_id,
              output: resultText,
            });
          }

          // 11. Send tool results back to OpenAI
          response = await openai.responses.create({
            model: "gpt-4.1-mini",
            previous_response_id: response.id,
            input: toolOutputs,
            tools,
          });
        }
      } catch (error) {
        console.error(
          "\nCould not process this question:",
          error instanceof Error ? error.message : error
        );
      }
    }
  } finally {
    // 12. Close resources
    rl.close();
    await client.close();
  }
}

main().catch((error) => {
  console.error(
    "Application failed:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});