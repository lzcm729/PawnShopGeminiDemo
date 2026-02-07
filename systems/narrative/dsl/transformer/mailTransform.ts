/**
 * Mail Transformer
 * Transforms MailBlock AST nodes into MailTemplate objects
 */

import { MailBlock } from '../types';
import { MailTemplate } from '../../types';

/**
 * Transform a MailBlock AST node into a MailTemplate
 */
export function transformMail(ast: MailBlock): MailTemplate {
    const template: MailTemplate = {
        id: ast.id,
        sender: ast.sender,
        subject: ast.subject,
        body: processMailBody(ast.body)
    };

    // Add attachments if present
    if (ast.attachments) {
        template.attachments = {};
        if (ast.attachments.cash !== undefined) {
            template.attachments.cash = ast.attachments.cash;
        }
    }

    // Add delay if present
    if (ast.delay) {
        template.delay = ast.delay;
    }

    return template;
}

/**
 * Process mail body text
 * - Preserve variable interpolation {{variable}}
 * - Handle multiline text
 */
function processMailBody(body: string): string {
    // The body is already processed by the parser
    // Just ensure proper line breaks
    return body
        .split('\n')
        .map(line => line.trim())
        .join('\n');
}

/**
 * Transform multiple mail blocks
 */
export function transformMails(mails: MailBlock[]): Record<string, MailTemplate> {
    const result: Record<string, MailTemplate> = {};

    for (const mail of mails) {
        result[mail.id] = transformMail(mail);
    }

    return result;
}
