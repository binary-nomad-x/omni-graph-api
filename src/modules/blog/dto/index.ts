export interface CreatePostInput {
  title: string;
  content?: string | null;
  published?: boolean | null;
  tags?: string[];
  categories?: string[];
}

export interface UpdatePostInput {
  title?: string | null;
  content?: string | null;
  published?: boolean | null;
}

export interface CreateCommentInput {
  content: string;
  postId: string;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string | null;
}

export interface PostFilterInput {
  published?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}
