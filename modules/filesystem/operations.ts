import { z } from "zod";
import { op } from "../../packages/contract/src/op";
import { Base64 } from "../../packages/contract/src/schemas";

const writeIn = z.object({ path: z.string(), data: Base64, public: z.boolean().optional() });
const writeOut = z.object({ path: z.string(), url: z.string().optional() });
const readIn = z.object({ path: z.string() });
const readOut = z.object({ data: Base64.nullable() });
const listIn = z.object({ prefix: z.string().optional() });
const listOut = z.object({ paths: z.array(z.string()) });
const urlIn = z.object({ path: z.string() });
const urlOut = z.object({ url: z.string() });

export const ops = {
  fsWrite: op({ method: "PUT", path: "/v1/fs/objects", inputFrom: "body",
    input: writeIn, output: writeOut, costCents: 2, summary: "Write an object to storage",
    serve: { port: "filesystem", method: "write" } }),
  fsRead: op({ method: "GET", path: "/v1/fs/objects", inputFrom: "query",
    input: readIn, output: readOut, costCents: 1, summary: "Read an object from storage",
    serve: { port: "filesystem", method: "read" } }),
  fsList: op({ method: "GET", path: "/v1/fs/list", inputFrom: "query",
    input: listIn, output: listOut, costCents: 0, summary: "List object paths",
    serve: { port: "filesystem", method: "list" } }),
  fsPublicUrl: op({ method: "GET", path: "/v1/fs/public-url", inputFrom: "query",
    input: urlIn, output: urlOut, costCents: 0, summary: "Get the public CDN url for a path",
    serve: { port: "filesystem", method: "publicUrl" } }),
};

export interface FileSystemPort {
  write(input: z.infer<typeof writeIn>): Promise<z.infer<typeof writeOut>>;
  read(input: z.infer<typeof readIn>): Promise<z.infer<typeof readOut>>;
  list(input: z.infer<typeof listIn>): Promise<z.infer<typeof listOut>>;
  publicUrl(input: z.infer<typeof urlIn>): Promise<z.infer<typeof urlOut>>;
}
