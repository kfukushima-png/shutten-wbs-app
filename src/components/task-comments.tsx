"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getCommentsByTask, createComment, deleteComment } from "@/lib/firestore";
import type { TaskComment } from "@/types";
import { format } from "date-fns";

interface Props {
  taskId: string;
  storeId: string;
  onCommentAdded?: () => void;
}

export default function TaskComments({ taskId, storeId, onCommentAdded }: Props) {
  const { appUser } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const loadComments = async () => {
    setComments(await getCommentsByTask(taskId));
  };

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !appUser) return;

    setLoading(true);
    await createComment({
      taskId,
      storeId,
      authorId: appUser.uid,
      authorName: appUser.displayName,
      authorPhotoURL: appUser.photoURL || "",
      content: newComment.trim(),
    });
    setNewComment("");
    setLoading(false);
    loadComments();
    onCommentAdded?.();
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId);
    loadComments();
  };

  return (
    <div className="mt-3">
      {/* コメント一覧 */}
      {comments.length > 0 && (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 group">
              {c.authorPhotoURL ? (
                <img src={c.authorPhotoURL} alt="" className="w-6 h-6 rounded-full mt-0.5 shrink-0" />
              ) : (
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold mt-0.5 shrink-0">
                  {c.authorName?.[0] || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">{c.authorName}</span>
                  <span className="text-xs text-gray-400">{format(c.createdAt, "MM/dd HH:mm")}</span>
                  {appUser?.uid === c.authorId && (
                    <button onClick={() => handleDelete(c.id)}
                      className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      削除
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 入力欄 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="コメントを追加..."
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-300"
        />
        <button type="submit" disabled={loading || !newComment.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
          送信
        </button>
      </form>
    </div>
  );
}
