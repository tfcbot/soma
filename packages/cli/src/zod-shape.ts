// Dependency-light Zod → readable shape dump. We don't pull in zod-to-openapi here so the
// compiled CLI binary stays small; the registry only uses a handful of Zod node types and this
// renders them into a JSON-shaped description an agent can read at a glance.
import { z } from "zod";

// Render any Zod schema into a plain JSON-able value describing its shape.
export function describeSchema(schema: z.ZodTypeAny): unknown {
  const def = schema._def;

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(shape)) {
        out[key] = describeSchema(value as z.ZodTypeAny);
      }
      return out;
    }
    case z.ZodFirstPartyTypeKind.ZodArray:
      return [describeSchema(def.type as z.ZodTypeAny)];
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return `${render(def.innerType as z.ZodTypeAny)} (optional)`;
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return `${render(def.innerType as z.ZodTypeAny)} (nullable)`;
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return `${render(def.innerType as z.ZodTypeAny)} (optional)`;
    default:
      return render(schema);
  }
}

// Render a leaf (or wrapper) schema as a short scalar label, carrying any .describe() text.
function render(schema: z.ZodTypeAny): string {
  const def = schema._def;
  const description = def.description ? ` — ${def.description}` : "";

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return `string${description}`;
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return `number${description}`;
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return `boolean${description}`;
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return `${render(def.innerType as z.ZodTypeAny)} (optional)`;
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return `${render(def.innerType as z.ZodTypeAny)} (nullable)`;
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return `${render(def.innerType as z.ZodTypeAny)} (optional)`;
    case z.ZodFirstPartyTypeKind.ZodEffects:
      // z.coerce.number() etc. wrap an inner schema in an effect.
      return `${render(def.schema as z.ZodTypeAny)}${description}`;
    case z.ZodFirstPartyTypeKind.ZodObject:
    case z.ZodFirstPartyTypeKind.ZodArray:
      return JSON.stringify(describeSchema(schema));
    default:
      return `${def.typeName?.replace(/^Zod/, "").toLowerCase() ?? "unknown"}${description}`;
  }
}
