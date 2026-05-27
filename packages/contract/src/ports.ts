// Port interfaces — one method per vendor op, typed DIRECTLY from the registry (Input/Output).
// Single-object input is what makes the generic dispatcher possible: the validated request body
// IS the argument, so there's no per-op unpacking. Binary crosses as base64 (the adapter bridges
// base64 ⇄ vendor bytes internally). Adding a port method = an op in the registry + this signature.
import type { Input, Output } from "./operations";

export interface PhonePort {
  sendSms(input: Input<"phoneSendSms">): Promise<Output<"phoneSendSms">>;
}
export interface EmailPort {
  send(input: Input<"emailSend">): Promise<Output<"emailSend">>;
}
export interface WalletPort {
  issueCard(input: Input<"walletIssueCard">): Promise<Output<"walletIssueCard">>;
}
export interface SandboxPort {
  exec(input: Input<"sandboxExec">): Promise<Output<"sandboxExec">>;
  putFile(input: Input<"sandboxPutFile">): Promise<Output<"sandboxPutFile">>;
  getFile(input: Input<"sandboxGetFile">): Promise<Output<"sandboxGetFile">>;
  dispose(input: Input<"sandboxDispose">): Promise<Output<"sandboxDispose">>;
}
export interface FileSystemPort {
  write(input: Input<"fsWrite">): Promise<Output<"fsWrite">>;
  read(input: Input<"fsRead">): Promise<Output<"fsRead">>;
  list(input: Input<"fsList">): Promise<Output<"fsList">>;
  publicUrl(input: Input<"fsPublicUrl">): Promise<Output<"fsPublicUrl">>;
}

// The bag of ports the generic dispatcher resolves against. Modules contribute entries.
export interface Ports {
  phone: PhonePort;
  email: EmailPort;
  wallet: WalletPort;
  sandbox: SandboxPort;
  filesystem: FileSystemPort;
}
export type PortName = keyof Ports;
