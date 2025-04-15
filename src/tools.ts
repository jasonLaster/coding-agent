import * as fs from "fs/promises";
import { Dirent } from "fs";

// Tool definitions and types
export interface ToolDefinition {
  name: string;
  description: string;
  function: (input: any) => Promise<string>;
  input_schema: Record<string, any>;
}

export const readFileTool: ToolDefinition = {
  name: "read_file",
  description:
    "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The relative path of a file in the working directory.",
      },
    },
    required: ["path"],
  },
  function: async (input: { path: string }) => {
    try {
      const content = await fs.readFile(input.path, "utf-8");
      return content;
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  },
};

export const listFilesTool: ToolDefinition = {
  name: "list_files",
  description:
    "List files and directories at a given path. If no path is provided, lists files in the current directory.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Optional relative path to list files from. Defaults to current directory if not provided.",
      },
    },
  },
  function: async (input: { path?: string }) => {
    const dirPath = input.path || ".";
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .map((entry: Dirent) =>
          entry.isDirectory() ? `${entry.name}/` : entry.name
        )
        .join("\n");
    } catch (error: any) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  },
};

export const editFileTool: ToolDefinition = {
  name: "edit_file",
  description:
    "Edit a file by replacing all occurrences of a string with another string.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The relative path of the file to edit.",
      },
      old_str: {
        type: "string",
        description: "The string to replace.",
      },
      new_str: {
        type: "string",
        description: "The replacement string.",
      },
    },
    required: ["path", "old_str", "new_str"],
  },
  function: async (input: {
    path: string;
    old_str: string;
    new_str: string;
  }) => {
    try {
      const content = await fs.readFile(input.path, "utf-8");
      const newContent = content.split(input.old_str).join(input.new_str);
      await fs.writeFile(input.path, newContent, "utf-8");
      return "File edited successfully.";
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File doesn't exist, create it with the new content
        await fs.writeFile(input.path, input.new_str, "utf-8");
        return `File "${input.path}" created with the specified content.`;
      }
      throw new Error(`Failed to edit file: ${error.message}`);
    }
  },
};
