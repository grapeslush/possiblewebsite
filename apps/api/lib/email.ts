import postmark from 'postmark';
import sgMail from '@sendgrid/mail';

type TemplateKey = 'order-message' | 'dispute-message' | 'review-approved' | 'review-rejected';

type TemplateConfig = {
  postmark?: string;
  sendgrid?: string;
};

const templateConfig: Record<TemplateKey, TemplateConfig> = {
  'order-message': {
    postmark: process.env.POSTMARK_ORDER_MESSAGE_TEMPLATE_ID,
    sendgrid: process.env.SENDGRID_ORDER_MESSAGE_TEMPLATE_ID,
  },
  'dispute-message': {
    postmark: process.env.POSTMARK_DISPUTE_MESSAGE_TEMPLATE_ID,
    sendgrid: process.env.SENDGRID_DISPUTE_MESSAGE_TEMPLATE_ID,
  },
  'review-approved': {
    postmark: process.env.POSTMARK_REVIEW_APPROVED_TEMPLATE_ID,
    sendgrid: process.env.SENDGRID_REVIEW_APPROVED_TEMPLATE_ID,
  },
  'review-rejected': {
    postmark: process.env.POSTMARK_REVIEW_REJECTED_TEMPLATE_ID,
    sendgrid: process.env.SENDGRID_REVIEW_REJECTED_TEMPLATE_ID,
  },
};

interface SendTemplateOptions<TModel extends Record<string, unknown>> {
  to: string;
  template: TemplateKey;
  model: TModel;
  subject?: string;
}

class EmailClient {
  private readonly postmarkClient?: postmark.ServerClient;
  private readonly sendgridReady: boolean;

  constructor() {
    const postmarkApiKey = process.env.POSTMARK_SERVER_TOKEN;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;

    if (postmarkApiKey) {
      this.postmarkClient = new postmark.ServerClient(postmarkApiKey);
    }

    if (sendgridApiKey) {
      sgMail.setApiKey(sendgridApiKey);
      this.sendgridReady = true;
    } else {
      this.sendgridReady = false;
    }
  }

  async sendTemplate<TModel extends Record<string, unknown>>(options: SendTemplateOptions<TModel>) {
    const config = templateConfig[options.template];

    if (this.postmarkClient && config.postmark) {
      await this.postmarkClient.sendEmailWithTemplate({
        To: options.to,
        From: process.env.POSTMARK_FROM_EMAIL ?? 'no-reply@example.com',
        TemplateId: Number(config.postmark),
        TemplateModel: options.model,
      });
      return;
    }

    if (this.sendgridReady && config.sendgrid) {
      await sgMail.send({
        to: options.to,
        from: process.env.SENDGRID_FROM_EMAIL ?? 'no-reply@example.com',
        templateId: config.sendgrid,
        dynamicTemplateData: options.model,
        subject: options.subject,
      });
      return;
    }

    console.info('Email sending skipped: no provider configured', {
      template: options.template,
      to: options.to,
    });
  }
}

export const emailClient = new EmailClient();
export type { TemplateKey };
