import type { Todo } from "../domain/todo";

// TodoPort — persistence for the work-state primitive. Adapter: Convex DB (or mock).
export interface NewTodo {
  title: string;
  brief: string;
  channelOrigin?: string;
  budget?: Todo["budget"];
}

export interface TodoStore {
  create(input: NewTodo): Promise<Todo>;
  get(id: string): Promise<Todo | null>;
  list(): Promise<Todo[]>;
  save(todo: Todo): Promise<Todo>;
}
