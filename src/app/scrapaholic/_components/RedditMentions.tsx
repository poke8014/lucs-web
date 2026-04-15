"use client";

import { useState } from "react";
import type { ApifyRedditPost } from "@/src/lib/apify-reddit";

interface RedditMentionsProps {
  posts: ApifyRedditPost[];
  isStreaming?: boolean;
}

function CommentCard({
  comment,
  postPermalink,
}: {
  comment: ApifyRedditPost["comments"][number];
  postPermalink: string;
}) {
  const commentUrl = `https://reddit.com${postPermalink}${comment.commentId}/`;

  return (
    <div className="text-xs">
      <div className="flex items-center gap-1.5 text-gray-400">
        <span className="font-medium">u/{comment.author}</span>
        <span>{comment.score} pts</span>
        {comment.isSubmitter && (
          <span className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-600">
            OP
          </span>
        )}
        <a
          href={commentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-blue-500 hover:text-blue-700 hover:underline"
        >
          view on reddit
        </a>
      </div>
      <p className="mt-0.5 leading-relaxed text-gray-600">
        {comment.text.length > 300
          ? comment.text.slice(0, 300) + "…"
          : comment.text}
      </p>
    </div>
  );
}

function PostCard({ post }: { post: ApifyRedditPost }) {
  const permalink = `https://reddit.com${post.permalink}`;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {post.title}
          </a>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {post.subreddit && <span>r/{post.subreddit}</span>}
            <span>{post.score} pts</span>
            <span>{post.numComments} comments</span>
          </div>
        </div>
      </div>

      {post.comments.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-gray-200 pl-3">
          {post.comments.map((comment) => (
            <CommentCard
              key={comment.commentId}
              comment={comment}
              postPermalink={post.permalink}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RedditMentions({
  posts,
  isStreaming = false,
}: RedditMentionsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const totalComments = posts.reduce((n, p) => n + p.comments.length, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between border-b border-gray-100 px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Reddit Mentions
          </h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {totalComments} comment{totalComments !== 1 ? "s" : ""} across{" "}
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              filtering relevant comments…
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {!collapsed && (
        <div className="max-h-96 space-y-3 overflow-y-auto px-6 py-5">
          {posts.map((post) => (
            <PostCard key={post.postId} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
