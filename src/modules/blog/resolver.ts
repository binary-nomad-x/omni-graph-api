import type { Context } from "@gql-prisma-api/types/context.js";
import type { Post as PostModel, Tag as TagModel, Category as CategoryModel } from "@prisma/client";
import type { IdArg, PostFilterArgs } from "@gql-prisma-api/types/graphql.js";
import type { CreatePostInput, UpdatePostInput, CreateCommentInput, CreateCategoryInput } from "@gql-prisma-api/modules/blog/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Post = {
  author: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostAuthor(parent.authorId),
  tags: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostTags(parent.id),
  categories: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostCategories(parent.id),
  comments: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostComments(parent.id),
  likes: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostLikes(parent.id),
  savedBy: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostSavedBy(parent.id),
  views: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostViews(parent.id),
  likeCount: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostLikeCount(parent.id),
  commentCount: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostCommentCount(parent.id),
  viewCount: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostViewCount(parent.id),
  saveCount: (parent: PostModel, _args: unknown, ctx: Context) => ctx.services.blog.resolvePostSaveCount(parent.id),
};

export const Query = {
  posts: (_parent: unknown, args: PostFilterArgs, ctx: Context) => ctx.services.blog.getPosts(args),

  post: (_parent: unknown, { id }: IdArg, ctx: Context) => ctx.services.blog.getPost(id),
};

export const Mutation = {
  createPost: (_parent: unknown, { input }: { input: CreatePostInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.blog.createPost(ctx.userId, input);
  },

  updatePost: (_parent: unknown, { id, input }: { id: string; input: UpdatePostInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.blog.updatePost(ctx.userId, id, input);
  },

  deletePost: (_parent: unknown, { id }: IdArg, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.blog.deletePost(ctx.userId, id);
  },

  publishPost: (_parent: unknown, { id }: IdArg, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.blog.publishPost(ctx.userId, id);
  },

  unpublishPost: (_parent: unknown, { id }: IdArg, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.blog.unpublishPost(ctx.userId, id);
  },

  createTag: (_parent: unknown, { name }: { name: string }, ctx: Context) => ctx.services.blog.createTag(name),

  createCategory: (_parent: unknown, { input }: { input: CreateCategoryInput }, ctx: Context) => ctx.services.blog.createCategory(input),

  createComment: (_parent: unknown, { input }: { input: CreateCommentInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.blog.createComment(ctx.userId, input);
  },

  deleteComment: (_parent: unknown, { id }: IdArg, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.blog.deleteComment(ctx.userId, id);
  },

  toggleLike: (_parent: unknown, { postId }: { postId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.blog.toggleLike(ctx.userId, postId);
  },
};

export const Tag = {
  postCount: (parent: TagModel, _args: unknown, ctx: Context) => ctx.services.blog.resolveTagPostCount(parent.id),
};

export const Category = {
  posts: (parent: CategoryModel, _args: unknown, ctx: Context) => ctx.services.blog.resolveCategoryPosts(parent.id),
  products: (parent: CategoryModel, _args: unknown, ctx: Context) => ctx.services.blog.resolveCategoryProducts(parent.id),
  postCount: (parent: CategoryModel, _args: unknown, ctx: Context) => ctx.services.blog.resolveCategoryPostCount(parent.id),
  productCount: (parent: CategoryModel, _args: unknown, ctx: Context) => ctx.services.blog.resolveCategoryProductCount(parent.id),
};
