import * as express from 'express'
import { ApolloServer } from 'apollo-server-express'
import * as fs from 'fs'
import * as https from 'https'
import * as http from 'http'
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

async function startApolloServer() {
  const configurations = {
    // Note: You may need sudo to run on port 443
    production: { ssl: true, port: 4000, hostname: 'gwächs.haus' },
    development: { ssl: false, port: 4000, hostname: 'localhost' },
  }

  const environment = process.env.NODE_ENV || 'production'
  const config = configurations[environment]

  const server = new ApolloServer({
    schema,
    context: context,
    plugins: [myPlugin],
    subscriptions: {
      path: '/subscriptions'
    },
  })
  await server.start()

  const app = express()
  app.enable('trust proxy')
  app.use((req, res, next) => {
    req.secure ? next() : res.redirect('https://' + req.headers.host + req.url)
  })

  server.applyMiddleware({ app })

  // Create the HTTPS or HTTP server, per configuration
  let httpServer
  if (config.ssl) {
    // Assumes certificates are in a .ssl folder off of the package root.
    // Make sure these files are secured.
    httpServer = https.createServer(
      {
        key: fs.readFileSync(
          `/etc/letsencrypt/live/xn--gwchs-hra.haus/privkey.pem`,
        ),
        cert: fs.readFileSync(
          `/etc/letsencrypt/live/xn--gwchs-hra.haus/fullchain.pem`,
        ),
      },
      app,
    )
  } else {
    httpServer = http.createServer(app)
  }
  server.installSubscriptionHandlers(httpServer);

  await new Promise((resolve) =>
    httpServer.listen({ port: config.port }, resolve),
  )
  console.log(
    '🚀 Server ready at',
    `http${config.ssl ? 's' : ''}://${config.hostname}:${config.port}${
      server.graphqlPath
    }`,
    `Subscriptions ready at ws://${config.hostname}:${config.port}${server.subscriptionsPath}`,
  )
  return { server, app }
}

startApolloServer()
