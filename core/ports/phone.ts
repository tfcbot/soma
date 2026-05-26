// PhonePort — voice/SMS/iMessage. Adapter: AgentPhone (or mock).
export interface Phone {
  sendSms(to: string, body: string): Promise<{ id: string }>;
}
