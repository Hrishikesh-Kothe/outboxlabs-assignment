import nodemailer from "nodemailer";
import type { Sender } from "@prisma/client";

export function createTransport(sender: Sender) {
  return nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: false,
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPass,
    },
  });
}

export async function sendEmail(input: {
  sender: Sender;
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transport = createTransport(input.sender);
  const info = await transport.sendMail({
    from: input.sender.email,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}

export async function createEtherealSender(userId: string) {
  const account = await nodemailer.createTestAccount();
  return {
    userId,
    email: account.user,
    smtpHost: account.smtp.host,
    smtpPort: account.smtp.port,
    smtpUser: account.user,
    smtpPass: account.pass,
  };
}
