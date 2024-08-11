import { Api, Json } from '@pw/api';
import { array, number, object, string, z } from 'zod';

export const EmptyObject = object({}).strict();

export const TodoShape = object({
  id: number(),
  name: string(),
}).strict();

export const NewTodoShape = TodoShape.omit({ id: true }).strict();

export type Id = z.infer<typeof TodoShape.shape.id>;

export const list = () =>
  Api.Get(`/todos`).responses({
    SUCCESS: Json(200, array(TodoShape)),
  });

export const find = (id: Id) =>
  Api.Get(`/todos/${id}`).responses({
    SUCCESS: Json(200, TodoShape),
    NOT_FOUND: Json(404, EmptyObject),
    INVALID_INPUTS: Json(400, EmptyObject),
  });

export const add = (data: z.infer<typeof NewTodoShape>) =>
  Api.Post(`/todos`, { data }).responses({
    SUCCESS: Json(201, TodoShape),
    NOT_FOUND: Json(404, EmptyObject),
    INVALID_INPUTS: Json(400, EmptyObject),
  });

export const update = (data: z.infer<typeof TodoShape>) =>
  Api.Put(`/todos/${data.id}`, { data }).responses({
    SUCCESS: Json(200, TodoShape),
    NOT_FOUND: Json(404, EmptyObject),
    INVALID_INPUTS: Json(400, EmptyObject),
  });

export const remove = (id: Id) =>
  Api.Delete(`/todos/${id}`).responses({
    SUCCESS: Json(200, EmptyObject),
    NOT_FOUND: Json(404, EmptyObject),
    INVALID_INPUTS: Json(400, EmptyObject),
  });
