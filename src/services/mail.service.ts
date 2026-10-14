import { logger } from "@gql-prisma-api/utils/logger.js";

export class MailService {
  static async sendDeletedEmail(email: string, name?: string) {
    logger.info("Sending deleted email", { email, name });
  }
}
