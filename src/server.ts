import { ApolloServer } from 'apollo-server'
import { schema } from './schema'
import { context } from './context'

const myPlugin = {
  // Fires whenever a GraphQL request is received from a client.
  requestDidStart(requestContext) {
    console.log('Request started! Query:\n' + requestContext.request.query)

    return {
      // Fires whenever Apollo Server will parse a GraphQL
      // request to create its associated document AST.
      parsingDidStart(requestContext) {
        console.log('Parsing started!')
      },

      // Fires whenever Apollo Server will validate a
      // request's document AST against your GraphQL schema.
      validationDidStart(requestContext) {
        console.log('Validation started!')
      },
    }
  },
}

new ApolloServer({
  schema,
  context: context,
  plugins: [
    myPlugin
  ],
}).listen({ port: 4000 }, () =>
  console.log(`
🚀 Server ready at: http://localhost:4000
⭐️ See sample queries: http://pris.ly/e/ts/graphql-sdl-first#using-the-graphql-api`),
)
