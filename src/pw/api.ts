import { APIRequestContext, APIResponse, TestInfo, test as baseTest } from '@playwright/test';
import { fromZodError } from 'zod-validation-error';
import { never, record, RefinementCtx, string, ZodIssueCode, ZodType } from 'zod';

export const deserializedJson = string().transform((s: string, ctx: RefinementCtx) => {
  try {
    return JSON.parse(s);
  } catch (error) {
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message: `parsing the string resulted in invalid json: ${error}`,
    });
    return never;
  }
});

type FetchOptions = Parameters<APIRequestContext['fetch']>[1];

export type ReqSpec = {
  url: string;
  options: FetchOptions;
};

export type ResSpec<T> = {
  status: number;
  headers: ZodType;
  body: ZodType<T>;
};

const builder = (method: string) => (url: string, options?: Readonly<FetchOptions>) => ({
  responses: <O extends object>(o: O): { [K in keyof O]: { req: ReqSpec; res: O[K] } } & { req: ReqSpec } => {
    const merged = { ...options, ...{ method } };
    merged.headers ??= {};
    merged.headers['Accept'] = 'application/json';
    const req: ReqSpec = {
      url,
      options: merged,
    };
    const y = {} as { [K in keyof O]: { req: ReqSpec; res: O[K] } };
    for (const k in o) {
      if (Object.prototype.hasOwnProperty.call(o, k)) {
        y[k] = { req, res: o[k] };
      }
    }
    return { ...y, req };
  },
});

export const Api = {
  Get: builder('get'),
  Post: builder('post'),
  Put: builder('put'),
  Patch: builder('patch'),
  Delete: builder('delete'),
};

export const Json = <T>(status: number, body: ZodType<T>): ResSpec<T> => ({
  status,
  headers: record(string(), string()).superRefine((r, ctx) => {
    const contentType = ['Content-Type', 'content-type'].map((k) => r[k]).find((x) => x !== undefined);
    if (contentType === undefined) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: `Expected Content-Type 'application/json' header but it was missing`,
        fatal: true,
      });
      return never;
    }
    if (!/application\/json/.test(contentType)) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: `Expected Content-Type 'application/json' header but it was ${contentType}`,
        fatal: true,
      });
      return never;
    }
    return r;
  }),
  body,
});

const parse = async <T>(req: ReqSpec, res: ResSpec<T>, apiResponse: APIResponse, testInfo: TestInfo): Promise<T> => {
  const tryJson = (s: string) => {
    const res = deserializedJson.safeParse(s);
    return res.success ? res.data : s;
  };
  const response = {
    url: apiResponse.url(),
    status: apiResponse.status(),
    headers: apiResponse.headers(),
    body: await apiResponse.text(),
  };
  const addAttachments = async () => {
    await testInfo.attach('request', {
      contentType: 'application/json',
      body: JSON.stringify(req, null, 2),
    });
    await testInfo.attach('response', {
      contentType: 'application/json',
      body: JSON.stringify({ ...response, body: tryJson(response.body) }, null, 2),
    });
  };
  if (response.status !== res.status) {
    await addAttachments();
    throw new Error(
      [
        'Bad status/code (see attachments for request and response)',
        `Expected: ${res.status}`,
        `Actual ${response.status}`,
      ].join('\n'),
    );
  }
  const parsedHeaders = res.headers.safeParse(response.headers);
  if (!parsedHeaders.success) {
    await addAttachments();
    throw new Error(
      [
        'Bad headers (see attachments for request and response)',
        fromZodError(parsedHeaders.error, {
          prefix: 'Concrete issues were',
          prefixSeparator: ':\n- ',
          issueSeparator: '\n- ',
        }).toString(),
      ].join('\n'),
    );
  }
  const parsedBody = deserializedJson.pipe(res.body).safeParse(response.body);
  if (parsedBody.success) {
    return parsedBody.data;
  } else {
    await addAttachments();
    throw new Error(
      [
        'Bad body (see attachments for request and response)',
        fromZodError(parsedBody.error, {
          prefix: 'Concrete issues were',
          prefixSeparator: ':\n- ',
          issueSeparator: '\n- ',
        }).toString(),
      ].join('\n'),
    );
  }
};

export type ApiClient = <T>(_: { req: ReqSpec; res: ResSpec<T> }, memo?: string) => Promise<T>;

export function makeApiClient(apiRequestContext: APIRequestContext, testInfo: TestInfo): ApiClient {
  async function self<T>({ req, res }: { req: ReqSpec; res: ResSpec<T> }, memo?: string): Promise<T> {
    return await test.step(
      `${(req.options?.method ?? 'get').toUpperCase()} ${req.url}${memo === undefined ? '' : ' - ' + memo}`,
      async () => {
        const apiResponse = await apiRequestContext.fetch(req.url, req.options);
        try {
          return await parse(req, res, apiResponse, testInfo);
        } finally {
          await apiResponse.dispose();
        }
      },
      {
        box: true,
      },
    );
  }
  return self;
}

export const test = baseTest.extend<{ $: ApiClient }>({
  $: async ({ request }, use, testInfo) => {
    await use(makeApiClient(request, testInfo));
  },
});
