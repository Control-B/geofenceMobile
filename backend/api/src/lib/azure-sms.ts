import { SmsClient } from "@azure/communication-sms";
import { logger } from "./logger.js";

function getSmsClient(): SmsClient | null {
  const connStr = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  if (!connStr) return null;
  try {
    return new SmsClient(connStr);
  } catch {
    return null;
  }
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const from = process.env.AZURE_SMS_FROM_NUMBER;
  const client = getSmsClient();

  if (!client || !from) {
    // Mock fallback — log and continue
    logger.info({ to, message }, "[SMS MOCK] Would send SMS");
    return true;
  }

  try {
    const results = await client.send({ from, to: [to], message });
    const success = results[0]?.successful ?? false;
    if (!success) logger.warn({ to, error: results[0]?.errorMessage }, "SMS send failed");
    return success;
  } catch (err) {
    logger.error({ err, to }, "ACS SMS error");
    return false;
  }
}

// ─── Pre-built SMS templates ─────────────────────────────────────────────────

export async function smsCheckinConfirmation(phone: string, loadNumber: string, facility: string) {
  return sendSms(phone, `DockFlow: You've checked in for Load ${loadNumber} at ${facility}. We'll notify you when a dock is assigned.`);
}

export async function smsDockAssigned(phone: string, loadNumber: string, dock: string) {
  return sendSms(phone, `DockFlow: Dock ${dock} assigned for Load ${loadNumber}. Please proceed to the dock.`);
}

export async function smsLoadComplete(phone: string, loadNumber: string) {
  return sendSms(phone, `DockFlow: Load ${loadNumber} is complete. You are cleared to depart. Safe travels!`);
}

export async function smsClerkApprovalNeeded(phone: string, loadNumber: string, docName: string) {
  return sendSms(phone, `DockFlow: Document "${docName}" for Load ${loadNumber} needs your signature. Please check DockFlow.`);
}
