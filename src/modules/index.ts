import type { Context } from "@gql-prisma-api/types/context.js";

import { Mutation as AuthMutation } from "@gql-prisma-api/modules/auth/resolver.js";
import { User, Query as UserQuery, Mutation as UserMutation } from "@gql-prisma-api/modules/user/resolver.js";
import { Post, Tag, Category, Query as PostQuery, Mutation as PostMutation } from "@gql-prisma-api/modules/blog/resolver.js";
import { Product, Query as ProductQuery, Mutation as ProductMutation } from "@gql-prisma-api/modules/product/resolver.js";
import { Order, OrderItem, Query as OrderQuery, Mutation as OrderMutation } from "@gql-prisma-api/modules/order/resolver.js";
import { Payment, Query as PaymentQuery, Mutation as PaymentMutation } from "@gql-prisma-api/modules/payment/resolver.js";
import { Refund, Query as RefundQuery, Mutation as RefundMutation } from "@gql-prisma-api/modules/refund/resolver.js";
import { Review, Query as ReviewQuery, Mutation as ReviewMutation } from "@gql-prisma-api/modules/review/resolver.js";
import { Address, Query as AddressQuery, Mutation as AddressMutation } from "@gql-prisma-api/modules/address/resolver.js";
import { Cart, CartItem, Query as CartQuery, Mutation as CartMutation } from "@gql-prisma-api/modules/cart/resolver.js";
import { Wishlist, WishlistItem, Query as WishlistQuery, Mutation as WishlistMutation } from "@gql-prisma-api/modules/wishlist/resolver.js";
import { Coupon, Query as CouponQuery, Mutation as CouponMutation } from "@gql-prisma-api/modules/coupon/resolver.js";
import { Shipment, Query as ShipmentQuery, Mutation as ShipmentMutation } from "@gql-prisma-api/modules/shipment/resolver.js";
import { Notification, Query as NotificationQuery, Mutation as NotificationMutation } from "@gql-prisma-api/modules/notification/resolver.js";
import { Follow, Query as FollowQuery, Mutation as FollowMutation } from "@gql-prisma-api/modules/follow/resolver.js";
import { SavedPost, Query as SavedPostQuery, Mutation as SavedPostMutation } from "@gql-prisma-api/modules/savedPost/resolver.js";
import { PostView, Mutation as PostViewMutation } from "@gql-prisma-api/modules/postView/resolver.js";
import { ProductImage } from "@gql-prisma-api/modules/productImage/resolver.js";
import { Query as NovuQuery, Mutation as NovuMutation } from "@gql-prisma-api/modules/novu/resolver.js";
import { Query as StatsQuery } from "@gql-prisma-api/modules/stats/resolver.js";
import { Subscription, Query as SubscriptionQuery, Mutation as SubscriptionMutation } from "@gql-prisma-api/modules/subscription/resolver.js";
import { weatherResolvers } from "@gql-prisma-api/modules/weather/resolver.js";
import { Discount, Query as DiscountQuery, Mutation as DiscountMutation } from "@gql-prisma-api/modules/discount/resolver.js";
import { Invoice, Query as InvoiceQuery, Mutation as InvoiceMutation } from "@gql-prisma-api/modules/invoice/resolver.js";
import { ReturnRequest, Query as ReturnQuery, Mutation as ReturnMutation } from "@gql-prisma-api/modules/return/resolver.js";
import { SupportTicket, TicketReply, Query as SupportQuery, Mutation as SupportMutation } from "@gql-prisma-api/modules/support/resolver.js";
import {
  Conversation,
  ConversationParticipant,
  Message,
  Query as ConversationQuery,
  Mutation as ConversationMutation,
} from "@gql-prisma-api/modules/conversation/resolver.js";

export const resolvers = {
  Query: {
    ...UserQuery,
    ...PostQuery,
    ...weatherResolvers.Query,
    ...ProductQuery,
    ...OrderQuery,
    ...PaymentQuery,
    ...RefundQuery,
    ...ReviewQuery,
    ...AddressQuery,
    ...CartQuery,
    ...WishlistQuery,
    ...CouponQuery,
    ...ShipmentQuery,
    ...NotificationQuery,
    ...FollowQuery,
    ...SavedPostQuery,
    ...StatsQuery,
    ...SubscriptionQuery,
    ...DiscountQuery,
    ...InvoiceQuery,
    ...ReturnQuery,
    ...SupportQuery,
    ...ConversationQuery,
    ...NovuQuery,
  },

  Mutation: {
    ...AuthMutation,
    ...UserMutation,
    ...weatherResolvers.Mutation,
    ...PostMutation,
    ...ProductMutation,
    ...OrderMutation,
    ...PaymentMutation,
    ...RefundMutation,
    ...ReviewMutation,
    ...AddressMutation,
    ...CartMutation,
    ...WishlistMutation,
    ...CouponMutation,
    ...ShipmentMutation,
    ...NotificationMutation,
    ...FollowMutation,
    ...SavedPostMutation,
    ...PostViewMutation,
    ...SubscriptionMutation,
    ...DiscountMutation,
    ...InvoiceMutation,
    ...ReturnMutation,
    ...SupportMutation,
    ...ConversationMutation,
    ...NovuMutation,
  },

  User: { ...User },
  Post: { ...Post },
  Tag: { ...Tag },
  Category: { ...Category },
  Product: { ...Product },
  Review: { ...Review },
  Address: { ...Address },
  Cart: { ...Cart },
  CartItem: { ...CartItem },
  Wishlist: { ...Wishlist },
  WishlistItem: { ...WishlistItem },
  Coupon: { ...Coupon },
  Shipment: { ...Shipment },
  Notification: { ...Notification },
  Follow: { ...Follow },
  SavedPost: { ...SavedPost },
  PostView: { ...PostView },
  ProductImage: { ...ProductImage },
  Payment: { ...Payment },
  Refund: { ...Refund },
  Order: { ...Order },
  OrderItem: { ...OrderItem },
  Subscription: { ...Subscription },
  Discount: { ...Discount },
  Invoice: { ...Invoice },
  ReturnRequest: { ...ReturnRequest },
  SupportTicket: { ...SupportTicket },
  TicketReply: { ...TicketReply },
  Conversation: { ...Conversation },
  ConversationParticipant: { ...ConversationParticipant },
  Message: { ...Message },
};

export type ResolverContext = Context;

export type { WeatherForecast, WeatherCurrent, WeatherHourly } from "@gql-prisma-api/modules/weather/weather.service.js";
