// EmailPort — correspondence, signups, delivery-by-attachment. Adapter: AgentMail (or mock).
export interface EmailAttachment {
  filename: string;
  url: string; // a storage pointer the recipient can fetch
}

export interface Email {
  send(input: {
    to: string;
    subject: string;
    body: string;
    attachments?: EmailAttachment[];
  }): Promise<{ id: string }>;
}
