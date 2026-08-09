export interface Poll {
  id: string;
  question: string;
  options: string[];
  multiVote: boolean;
  createdBy: string;
  createdAt: number;
  votes: Record<string, string[]>; // username -> selected options
  closed: boolean;
}
