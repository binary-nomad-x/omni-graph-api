import type { PrismaClient } from "@prisma/client";

export interface SeedContext {
  prisma: PrismaClient;
}

export interface SeedCounts {
  users: number;
  profiles: number;
  addresses: number;
  tags: number;
  categories: number;
  posts: number;
  comments: number;
  likes: number;
  follows: number;
  notifications: number;
  savedPosts: number;
  postViews: number;
  products: number;
  productImages: number;
  reviews: number;
  wishlists: number;
  wishlistItems: number;
  carts: number;
  cartItems: number;
  coupons: number;
  orders: number;
  orderItems: number;
  payments: number;
  shipments: number;
  refunds: number;
  discounts: number;
  subscriptions: number;
  conversations: number;
  participants: number;
  messages: number;
  invoices: number;
  returns: number;
  tickets: number;
  ticketReplies: number;
  userCategoryFollows: number;
  novuWorkflows: number;
  novuVariableGroups: number;
  novuVariables: number;
}

export interface AddressSeed {
  userId: string;
  label: string;
  street: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  deliveryInstructions: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  isBilling: boolean;
  contactName: string;
  contactPhone: string;
}

export interface CartItemSeed {
  cartId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  notes: string | null;
  isSavedForLater: boolean;
}

export interface CommentSeed {
  content: string;
  isEdited: boolean;
  isApproved: boolean;
  upvotes: number;
  downvotes: number;
  authorId: string;
  postId: string;
  parentId: string | null;
  editedAt: Date | null;
}

export interface MessageSeed {
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  isRead: boolean;
  readAt: Date | null;
  deliveredAt: Date | null;
  editedAt: Date | null;
  attachments: object[] | null;
  reactions: object | null;
  parentId: string | null;
}

export interface DiscountSeed {
  productId: string;
  name: string;
  code: string;
  description: string;
  type: string;
  value: number;
  minQuantity: number;
  maxQuantity: number;
  minimumOrderAmount: number;
  usageLimitPerUser: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  stackable: boolean;
  priority: number;
  maxUsage: number;
  usedCount: number;
  createdById: string;
  metadata: object;
}

export interface FollowSeed {
  followerId: string;
  followingId: string;
  isMutual: boolean;
  notifyOnPost: boolean;
  notifyOnStory: boolean;
}

export interface InvoiceSeed {
  orderId: string;
  invoiceNumber: string;
  amount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  notes: string | null;
  billingAddress: string;
  shippingAddress: string;
  pdfUrl: string | null;
  items: object[];
  dueDate: Date;
  paidAt: Date | null;
  sentAt: Date | null;
}

export interface LikeSeed {
  userId: string;
  postId: string;
  type: string;
}

export interface NotificationSeed {
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string;
  actionUrl: string | null;
  imageUrl: string | null;
  channel: string;
  category: string;
  isRead: boolean;
  readAt: Date | null;
  seenAt: Date | null;
  deliveredAt: Date | null;
  expiresAt: Date | null;
  metadata: object;
}

export interface OrderSeed {
  id: string;
  userId: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  currency: string;
  shippingAddress: string;
  email: string;
  phone: string;
  notes: string | null;
  source: string;
  isGift: boolean;
  giftMessage: string | null;
  trackingUrl: string | null;
  couponId: string | null;
  estimatedDelivery: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
}

export interface OrderItemSeed {
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  productName: string;
  productSku: string;
  productImage: string;
  discountAmount: number;
  taxAmount: number;
  totalPrice: number;
}

export interface PaymentSeed {
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  gateway: string;
  gatewayTransactionId: string;
  status: string;
  fee: number;
  netAmount: number;
  payerEmail: string;
  payerName: string;
  billingAddress: string;
  failureReason: string | null;
  refundedAmount: number;
  capturedAmount: number;
  transactionId: string;
}

export interface UserSeed {
  email: string;
  username: string;
  name: string;
  age: number;
  role: string;
  password: string;
  avatarUrl: string;
  bio: string;
  phone: string;
  isVerified: boolean;
  lastLoginAt: Date;
  locale: string;
  timezone: string;
  metadata: Record<string, unknown>;
}

export interface PostViewSeed {
  postId: string;
  userId: string;
  ip: string;
  referrer?: string | null;
  userAgent: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  duration: number;
}

export interface RefundSeed {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  reason: string;
  reasonDescription: string;
  status: string;
  initiatedBy: string;
  fee: number;
}

export interface ReturnSeed {
  orderItemId: string;
  userId: string;
  reason: string;
  reasonDescription: string;
  resolution: string;
  refundAmount: number;
  returnLabelUrl: string;
  condition: string;
  status: string;
  quantity: number;
  images: object[];
  resolvedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredBackAt: Date | null;
  inspectedAt: Date | null;
}

export interface ReviewSeed {
  rating: number;
  title: string;
  content: string;
  isVerified: boolean;
  isRecommended: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  pros: string[] | null;
  cons: string[] | null;
  images: string[] | null;
  responseFromSeller: string | null;
  responseDate: Date | null;
  productId: string;
  userId: string;
}

export interface SavedPostSeed {
  userId: string;
  postId: string;
  note: string | null;
  folder: string;
}

export interface ShipmentSeed {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  shippingMethod: string;
  originAddress: string;
  destinationAddress?: string | null;
  weight: number;
  length: number;
  width: number;
  height: number;
  cost: number;
  currency: string;
  notes: string | null;
  estimatedDelivery: Date;
  deliveredAt: Date | null;
  shippedAt: Date | null;
}

export interface SubscriptionSeed {
  userId: string;
  plan: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  autoRenew: boolean;
  billingCycle: string;
  paymentMethod: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  lastBillingAt: Date | null;
  nextBillingAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  metadata: object;
}

export interface TicketReplySeed {
  ticketId: string;
  userId: string;
  content: string;
  isStaff: boolean;
  isInternal: boolean;
  isSolution: boolean;
  editedAt: Date | null;
  attachments: object[] | null;
}

export function createEmptyCounts(): SeedCounts {
  return {
    users: 0,
    profiles: 0,
    addresses: 0,
    tags: 0,
    categories: 0,
    posts: 0,
    comments: 0,
    likes: 0,
    follows: 0,
    notifications: 0,
    savedPosts: 0,
    postViews: 0,
    products: 0,
    productImages: 0,
    reviews: 0,
    wishlists: 0,
    wishlistItems: 0,
    carts: 0,
    cartItems: 0,
    coupons: 0,
    orders: 0,
    orderItems: 0,
    payments: 0,
    shipments: 0,
    refunds: 0,
    discounts: 0,
    subscriptions: 0,
    conversations: 0,
    participants: 0,
    messages: 0,
    invoices: 0,
    returns: 0,
    tickets: 0,
    ticketReplies: 0,
    userCategoryFollows: 0,
    novuWorkflows: 0,
    novuVariableGroups: 0,
    novuVariables: 0,
  };
}
