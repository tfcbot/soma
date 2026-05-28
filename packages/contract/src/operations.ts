import type { z } from "zod";
import { ops as phone } from "../../../modules/phone/operations";
import { ops as email } from "../../../modules/email/operations";
import { ops as sandbox } from "../../../modules/sandbox/operations";
import { ops as filesystem } from "../../../modules/filesystem/operations";
import { ops as account } from "../../../modules/account/operations";

// The registry = the merge of every capability module's ops slice. Add a capability by adding
// its module folder + one import/spread here. Everything else derives from this.
export const operations = {
  ...phone, ...email, ...sandbox, ...filesystem, ...account,
};

export type Operations = typeof operations;
export type OperationId = keyof Operations;
export type Input<K extends OperationId> = z.infer<Operations[K]["input"]>;
export type Output<K extends OperationId> = z.infer<Operations[K]["output"]>;
