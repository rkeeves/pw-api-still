import { Api, Json, test } from '@pw/api';
import * as Todos from '@api/todos';
import { createFixture } from 'zod-fixture';
import { expect } from '@playwright/test';
import { array, object, string, z } from 'zod';

const make = () => createFixture(Todos.NewTodoShape);

test('A lot of CRUD (see the Network tab of Trace for all request response exhanges)', async ({ $ }) => {
  let Todo = { id: 999_999, ...make() };
  await test.step('Not yet alive', async () => {
    expect(await $(Todos.list().SUCCESS)).not.toContainEqual(Todo);
    await $(Todos.find(Todo.id).NOT_FOUND);
    await $(Todos.update(Todo).NOT_FOUND);
    await $(Todos.remove(Todo.id).NOT_FOUND);
    const a = make();
    const x = await $(Todos.add(a).SUCCESS);
    const { id, ...rest } = x;
    expect(rest).toEqual(a);
    Todo = x;
  });
  await test.step('Alive', async () => {
    expect(await $(Todos.list().SUCCESS)).toContainEqual(Todo);
    expect(await $(Todos.find(Todo.id).SUCCESS)).toEqual(Todo);
    const a = { ...make(), id: Todo.id };
    const x = await $(Todos.update(a).SUCCESS);
    expect(x).toEqual(a);
    Todo = a;
    expect(await $(Todos.find(Todo.id).SUCCESS)).toEqual(Todo);
    await $(Todos.remove(Todo.id).SUCCESS);
  });
  await test.step('Dead', async () => {
    expect(await $(Todos.list().SUCCESS)).not.toContainEqual(Todo);
    await $(Todos.find(Todo.id).NOT_FOUND);
    await $(Todos.update(Todo).NOT_FOUND);
    await $(Todos.remove(Todo.id).NOT_FOUND);
  });
});

test('This case must fail (bad status code)', async ({ $ }) => {
  await $(Todos.find(999_999).SUCCESS);
});

test('This case must fail (bad body)', async ({ $ }) => {
  const User = object({
    uname: string(),
    email: object({
      primary: string().email(),
      secondary: string().email().optional(),
    }),
  });
  const listUsers = Api.Get('/users').responses({
    SUCCESS: Json(200, array(User).min(1)),
  });
  await $(listUsers.SUCCESS);
});

test('This case must fail (bad content-type)', async ({ $ }) => {
  const indexPage = Api.Get('/').responses({
    SUCCESS: Json(200, z.any()),
  });
  await $(indexPage.SUCCESS);
});
