import "reflect-metadata";
import { Field, ID, InputType, ObjectType } from "type-graphql";

@ObjectType("Invoice")
export class InvoiceObject {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  orderId!: string;

  @Field(() => String)
  invoiceNumber!: string;

  @Field(() => Number)
  amount!: number;

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  issuedAt!: Date;

  @Field(() => Date, { nullable: true })
  paidAt?: Date | null;

  @Field(() => Date)
  dueDate!: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@InputType("CreateInvoiceInput")
export class CreateInvoiceInputType {
  @Field(() => String)
  orderId!: string;

  @Field(() => String)
  dueDate!: string;
}
