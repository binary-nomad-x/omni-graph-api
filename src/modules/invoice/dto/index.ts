export interface CreateInvoiceInput {
  orderId: string;
  dueDate: string;
}

export interface InvoiceFilterInput {
  status?: string;
  limit?: number;
  offset?: number;
}
