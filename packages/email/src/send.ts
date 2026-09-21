import { Resend } from "resend";
import { NewCommentEmail } from "./templates/new-comment";
import { VerifyEmail } from "./templates/verify-email";
import { ReviewInviteEmail } from "./templates/review-invite";
import { ResetPasswordEmail } from "./templates/reset-password";

let client: Resend | null = null;

function getClient(): Resend {
  const apiKey = process.env["EMAIL_PROVIDER_API_KEY"];
  if (!apiKey) {
    throw new Error("EMAIL_PROVIDER_API_KEY environment variable is required to send email");
  }
  client ??= new Resend(apiKey);
  return client;
}

export interface SendNewCommentEmailInput {
  to: string;
  projectTitle: string;
  commenterName: string;
  commentSnippet: string;
  reviewUrl: string;
}

export async function sendNewCommentEmail(input: SendNewCommentEmailInput): Promise<void> {
  const from = process.env["EMAIL_FROM"];
  if (!from) {
    throw new Error("EMAIL_FROM environment variable is required to send email");
  }

  const { data, error } = await getClient().emails.send({
    from,
    to: input.to,
    subject: `${input.commenterName} left a comment on ${input.projectTitle}`,
    react: NewCommentEmail({
      projectTitle: input.projectTitle,
      commenterName: input.commenterName,
      commentSnippet: input.commentSnippet,
      reviewUrl: input.reviewUrl,
    }),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  console.log(`sendNewCommentEmail: sent to ${input.to} (id: ${data?.id})`);
}

export interface SendVerificationEmailInput {
  to: string;
  name: string;
  verifyUrl: string;
  isReminder?: boolean;
}

export async function sendVerificationEmail(input: SendVerificationEmailInput): Promise<void> {
  const from = process.env["EMAIL_FROM"];
  if (!from) {
    throw new Error("EMAIL_FROM environment variable is required to send email");
  }

  const isReminder = input.isReminder ?? false;
  const { data, error } = await getClient().emails.send({
    from,
    to: input.to,
    subject: isReminder ? "Reminder: verify your Easymarker email" : "Verify your Easymarker email",
    react: VerifyEmail({ name: input.name, verifyUrl: input.verifyUrl, isReminder }),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  console.log(`sendVerificationEmail: sent to ${input.to} (id: ${data?.id}, reminder: ${isReminder})`);
}

export interface SendReviewInviteEmailInput {
  to: string;
  inviterName: string;
  projectTitle: string;
  reviewUrl: string;
}

export async function sendReviewInviteEmail(input: SendReviewInviteEmailInput): Promise<void> {
  const from = process.env["EMAIL_FROM"];
  if (!from) {
    throw new Error("EMAIL_FROM environment variable is required to send email");
  }

  const { data, error } = await getClient().emails.send({
    from,
    to: input.to,
    subject: `${input.inviterName} wants your feedback on ${input.projectTitle}`,
    react: ReviewInviteEmail({
      inviterName: input.inviterName,
      projectTitle: input.projectTitle,
      reviewUrl: input.reviewUrl,
    }),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  console.log(`sendReviewInviteEmail: sent to ${input.to} (id: ${data?.id})`);
}

export interface SendPasswordResetEmailInput {
  to: string;
  name: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
  const from = process.env["EMAIL_FROM"];
  if (!from) {
    throw new Error("EMAIL_FROM environment variable is required to send email");
  }

  const { data, error } = await getClient().emails.send({
    from,
    to: input.to,
    subject: "Reset your Easymarker password",
    react: ResetPasswordEmail({ name: input.name, resetUrl: input.resetUrl }),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  console.log(`sendPasswordResetEmail: sent to ${input.to} (id: ${data?.id})`);
}
