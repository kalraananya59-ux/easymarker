export interface ReplyData {
  id: string;
  authorName: string;
  authorId: string | null;
  body: string;
  createdAt: string;
}

export interface StatusChangeData {
  id: string;
  status: "open" | "in_progress" | "resolved";
  changedByName: string;
  createdAt: string;
}

export interface CommentData {
  id: string;
  reviewerId: string | null;
  reviewerName: string;
  body: string;
  status: "open" | "in_progress" | "resolved";
  positionX: number;
  positionY: number;
  createdAt: string;
  replies: ReplyData[];
  statusChanges: StatusChangeData[];
}
