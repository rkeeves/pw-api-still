# pw-api-still

I'm still doing lame things instead of declarative statically typed code.

## How to run

```shell
# install
npm i
# start server in the current shell
npm run server
# run tests
npm t
# open report in browser
npm run show
```

The __trace gets generated__ by default, because I wanted to make an argument...

## Notes

Q: Erm... why don't you autogenerate the code? Like described [here](https://engineering.kablamo.com.au/posts/2024/orval-and-zod-for-contract-testing/contract-testing-using-playwright/)? Autogen sounds [dreamy](https://youtu.be/H3Q3uxVo2hg?t=21)!

A: I tried `kubb`, `orval` and a generator for `zodios` and even more lower-level ones... but they have their own problems. TLDR: You lose tracing if you don't fetch via playwright's `APIRequestContext` to my understanding.

Imo there are 3 things we need:
- We __must__ be able to use Playwright's `APIRequestContext` as a fetcher, otherwise we lose the abilitiy to generate `Trace`s.
- We __must__ be able to weave zod / yup after the fetch. Aka we 100% need runtime validation.
- We __must__ be able to manually derp around the schemas and the endpoint calls, because in 'real projects' the swagger lies, and also things are not completely finished, so you have to work around the warts.

Therefore - maybe - manually writing out the things might be the solution. I don't know.

## Sidenotes

Sidenote 1: I dropped the whole 'play nice with jest and extend the base `expect`' spiel. `expect` destroys information due to void return type.

Sidenote 2: I might be dumb, but I think Zod has too much inheritance and as a consequence the ZodType cannot constrain itself to be non-nullable. At least I wasn't able to do composition of generics without running into everything turning into optional. As a silverlining: Zod behaves well if you are only dealing with concrete types.

Sidenote 3: A solution would be... forking [typed-openapi](https://github.com/astahmer/typed-openapi) or [openapi-zod-client](https://github.com/astahmer/openapi-zod-client)... or... doing the whole ten yards starting from the [@apidevtools/swagger-parser](https://github.com/APIDevTools/swagger-parser)... Pick your poison I guess...
