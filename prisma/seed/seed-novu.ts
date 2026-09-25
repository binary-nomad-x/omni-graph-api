import type { SeedContext, SeedCounts } from "./types.js";

interface NovuVariableSeed {
  key: string;
  type: string;
  label: string;
  description: string;
  exampleValue: string;
  required: boolean;
  defaultValue?: string;
  aliases?: string[];
}

interface NovuGroupSeed {
  name: string;
  description: string;
  sortOrder: number;
  variables: NovuVariableSeed[];
}

const WORKFLOWS: { workflowId: string; name: string; description: string; tags: string[] }[] = [
  { workflowId: "welcome", name: "Welcome", description: "Sent when a user signs up", tags: ["onboarding", "auth"] },
  { workflowId: "post-published", name: "Post Published", description: "Notifies the author when a post goes live", tags: ["blog", "content"] },
  { workflowId: "comment-on-post", name: "Comment on Post", description: "Notifies the author when someone comments on a post", tags: ["blog", "engagement"] },
  { workflowId: "order-placed", name: "Order Placed", description: "Confirmation when a new order is placed", tags: ["commerce", "order"] },
  { workflowId: "order-cancelled", name: "Order Cancelled", description: "Notifies the customer when their order is cancelled", tags: ["commerce", "order"] },
  { workflowId: "payment-processed", name: "Payment Processed", description: "Confirmation that a payment succeeded", tags: ["commerce", "payment"] },
  { workflowId: "refund-processed", name: "Refund Processed", description: "Notifies the customer when a refund is issued", tags: ["commerce", "payment"] },
  { workflowId: "shipment-updated", name: "Shipment Updated", description: "Tracking updates on a shipment", tags: ["commerce", "shipping"] },
  { workflowId: "new-follower", name: "New Follower", description: "Notifies a user when someone follows them", tags: ["social", "engagement"] },
  { workflowId: "review-received", name: "Review Received", description: "Notifies the seller when a product review is posted", tags: ["commerce", "engagement"] },
  { workflowId: "invoice-created", name: "Invoice Created", description: "Sent when an invoice is generated", tags: ["commerce", "billing"] },
  { workflowId: "invoice-paid", name: "Invoice Paid", description: "Confirmation that an invoice has been paid", tags: ["commerce", "billing"] },
  { workflowId: "invoice-overdue", name: "Invoice Overdue", description: "Reminder that an invoice is overdue", tags: ["commerce", "billing"] },
  { workflowId: "return-requested", name: "Return Requested", description: "Notifies staff when a return is requested", tags: ["commerce", "returns"] },
  { workflowId: "return-approved", name: "Return Approved", description: "Notifies the customer when a return is approved", tags: ["commerce", "returns"] },
  { workflowId: "return-rejected", name: "Return Rejected", description: "Notifies the customer when a return is rejected", tags: ["commerce", "returns"] },
  { workflowId: "return-refunded", name: "Return Refunded", description: "Notifies the customer when a return is refunded", tags: ["commerce", "returns"] },
  { workflowId: "ticket-created", name: "Ticket Created", description: "Confirmation when a support ticket is opened", tags: ["support"] },
  { workflowId: "ticket-updated", name: "Ticket Updated", description: "Notifies when a support ticket is updated", tags: ["support"] },
  { workflowId: "ticket-resolved", name: "Ticket Resolved", description: "Notifies when a support ticket is resolved", tags: ["support"] },
  { workflowId: "trial-ending", name: "Trial Ending", description: "Reminder that a subscription trial is ending", tags: ["subscription", "billing"] },
];

const GROUPS: NovuGroupSeed[] = [
  {
    name: "User",
    description: "Identity and profile variables for the recipient",
    sortOrder: 1,
    variables: [
      { key: "userName", type: "STRING", label: "User Name", description: "Recipient's display name", exampleValue: "John Doe", required: true },
      { key: "userEmail", type: "STRING", label: "User Email", description: "Recipient's email address", exampleValue: "john@example.com", required: true },
      { key: "userPhone", type: "STRING", label: "User Phone", description: "Recipient's phone number", exampleValue: "(555) 123-4567", required: false },
      { key: "userLocale", type: "STRING", label: "User Locale", description: "Recipient's locale", exampleValue: "en-US", required: false, defaultValue: "en" },
    ],
  },
  {
    name: "Order",
    description: "Order-related variables",
    sortOrder: 2,
    variables: [
      { key: "orderId", type: "STRING", label: "Order Id", description: "Internal order id", exampleValue: "ckx1234567890", required: true },
      { key: "orderNumber", type: "STRING", label: "Order Number", description: "Human-friendly order number", exampleValue: "ORD-000001", required: true },
      { key: "orderStatus", type: "STRING", label: "Order Status", description: "Current order status", exampleValue: "PROCESSING", required: false, defaultValue: "PENDING" },
      { key: "orderTotal", type: "NUMBER", label: "Order Total", description: "Total order amount", exampleValue: "249.99", required: true },
      { key: "orderCurrency", type: "STRING", label: "Order Currency", description: "Currency of the order", exampleValue: "USD", required: false, defaultValue: "USD" },
    ],
  },
  {
    name: "Payment",
    description: "Payment-related variables",
    sortOrder: 3,
    variables: [
      { key: "paymentAmount", type: "NUMBER", label: "Payment Amount", description: "Amount charged", exampleValue: "249.99", required: true },
      { key: "paymentCurrency", type: "STRING", label: "Payment Currency", description: "Currency used", exampleValue: "USD", required: false, defaultValue: "USD" },
      { key: "paymentMethod", type: "STRING", label: "Payment Method", description: "Payment method used", exampleValue: "credit_card", required: false },
      { key: "paymentStatus", type: "STRING", label: "Payment Status", description: "Payment status", exampleValue: "COMPLETED", required: false, defaultValue: "PENDING" },
    ],
  },
  {
    name: "Refund",
    description: "Refund-related variables",
    sortOrder: 4,
    variables: [
      { key: "refundAmount", type: "NUMBER", label: "Refund Amount", description: "Amount refunded", exampleValue: "49.99", required: true },
      { key: "refundReason", type: "STRING", label: "Refund Reason", description: "Reason for the refund", exampleValue: "Defective product", required: false },
      { key: "refundStatus", type: "STRING", label: "Refund Status", description: "Refund workflow status", exampleValue: "COMPLETED", required: false, defaultValue: "PENDING" },
    ],
  },
  {
    name: "Shipment",
    description: "Shipment and tracking variables",
    sortOrder: 5,
    variables: [
      { key: "trackingNumber", type: "STRING", label: "Tracking Number", description: "Carrier tracking number", exampleValue: "1Z999AA10123456784", required: true },
      { key: "carrier", type: "STRING", label: "Carrier", description: "Shipping carrier", exampleValue: "UPS", required: false },
      { key: "estimatedDelivery", type: "DATE", label: "Estimated Delivery", description: "Expected delivery date", exampleValue: "2026-10-05T00:00:00Z", required: false },
    ],
  },
  {
    name: "Subscription",
    description: "Subscription and billing cycle variables",
    sortOrder: 6,
    variables: [
      { key: "planName", type: "STRING", label: "Plan Name", description: "Subscription plan", exampleValue: "PRO", required: true },
      { key: "billingCycle", type: "STRING", label: "Billing Cycle", description: "Billing frequency", exampleValue: "monthly", required: false, defaultValue: "monthly" },
      { key: "trialEnd", type: "DATE", label: "Trial End", description: "End date of the trial", exampleValue: "2026-10-01T00:00:00Z", required: false },
      { key: "nextBillingDate", type: "DATE", label: "Next Billing Date", description: "Next charge date", exampleValue: "2026-11-01T00:00:00Z", required: false },
    ],
  },
  {
    name: "Notification",
    description: "In-app notification content variables",
    sortOrder: 7,
    variables: [
      { key: "notificationTitle", type: "STRING", label: "Notification Title", description: "Short title of the notification", exampleValue: "Your order shipped", required: true },
      { key: "notificationMessage", type: "STRING", label: "Notification Message", description: "Body of the notification", exampleValue: "Your order is on its way", required: false },
      { key: "actionUrl", type: "STRING", label: "Action URL", description: "Deep link to the resource", exampleValue: "https://app.example.com/orders/ckx1234567890", required: false },
    ],
  },
  {
    name: "Invoice",
    description: "Invoice and billing document variables",
    sortOrder: 8,
    variables: [
      { key: "invoiceNumber", type: "STRING", label: "Invoice Number", description: "Human-friendly invoice number", exampleValue: "INV-000001", required: true },
      { key: "invoiceTotal", type: "NUMBER", label: "Invoice Total", description: "Total invoice amount", exampleValue: "219.99", required: true },
      { key: "invoiceDueDate", type: "DATE", label: "Invoice Due Date", description: "Payment due date", exampleValue: "2026-10-30T00:00:00Z", required: false },
      { key: "invoiceStatus", type: "STRING", label: "Invoice Status", description: "Invoice status", exampleValue: "PENDING", required: false, defaultValue: "PENDING" },
    ],
  },
  {
    name: "Return",
    description: "Return request variables",
    sortOrder: 9,
    variables: [
      { key: "returnReason", type: "STRING", label: "Return Reason", description: "Why the customer returned the item", exampleValue: "Wrong size", required: true },
      { key: "returnStatus", type: "STRING", label: "Return Status", description: "Return workflow status", exampleValue: "APPROVED", required: false, defaultValue: "PENDING" },
      { key: "returnRefundAmount", type: "NUMBER", label: "Return Refund Amount", description: "Refund amount for the return", exampleValue: "35.00", required: false },
    ],
  },
  {
    name: "Ticket",
    description: "Support ticket variables",
    sortOrder: 10,
    variables: [
      { key: "ticketSubject", type: "STRING", label: "Ticket Subject", description: "Subject line of the ticket", exampleValue: "Order not delivered", required: true },
      { key: "ticketStatus", type: "STRING", label: "Ticket Status", description: "Ticket status", exampleValue: "OPEN", required: false, defaultValue: "OPEN" },
      { key: "ticketPriority", type: "STRING", label: "Ticket Priority", description: "Priority of the ticket", exampleValue: "HIGH", required: false, defaultValue: "MEDIUM" },
      { key: "ticketCategory", type: "STRING", label: "Ticket Category", description: "Support category", exampleValue: "shipping", required: false, defaultValue: "general" },
    ],
  },
  {
    name: "Review",
    description: "Product review variables",
    sortOrder: 11,
    variables: [
      { key: "reviewRating", type: "NUMBER", label: "Review Rating", description: "Star rating given", exampleValue: "5", required: true },
      { key: "reviewTitle", type: "STRING", label: "Review Title", description: "Headline of the review", exampleValue: "Great value", required: false },
      { key: "productName", type: "STRING", label: "Product Name", description: "Product being reviewed", exampleValue: "Eco Water Bottle", required: false },
    ],
  },
];

export async function seedNovu(ctx: SeedContext, counts: SeedCounts): Promise<void> {
  const existedBefore = (await ctx.prisma.novuWorkflow.count()) > 0;

  for (const wf of WORKFLOWS) {
    await ctx.prisma.novuWorkflow.upsert({
      where: { workflowId: wf.workflowId },
      update: {},
      create: {
        workflowId: wf.workflowId,
        name: wf.name,
        description: wf.description,
        tags: wf.tags,
        status: "ACTIVE",
        active: true,
      },
    });
  }
  counts.novuWorkflows += existedBefore ? 0 : WORKFLOWS.length;

  const groupsExist = (await ctx.prisma.novuVariableGroup.count()) > 0;
  if (!groupsExist) {
    for (const group of GROUPS) {
      const created = await ctx.prisma.novuVariableGroup.create({
        data: {
          name: group.name,
          description: group.description,
          sortOrder: group.sortOrder,
        },
      });
      counts.novuVariableGroups++;

      await ctx.prisma.novuVariable.createMany({
        data: group.variables.map((v) => ({
          groupId: created.id,
          key: v.key,
          type: v.type,
          label: v.label,
          description: v.description,
          exampleValue: v.exampleValue,
          required: v.required,
          defaultValue: v.defaultValue ?? null,
          aliases: v.aliases ?? [],
        })),
      });
      counts.novuVariables += group.variables.length;
    }
  }
}