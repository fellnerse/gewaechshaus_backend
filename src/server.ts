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
    production: { ssl: true, port: 4001, https_port: 4000, hostname: 'gwächs.haus' },
    development: { ssl: false, port: 4001,https_port: 4000, hostname: 'localhost' },
  }

  const environment = process.env.NODE_ENV || 'production'
  const config = configurations[environment]

  const server = new ApolloServer({
    schema,
    context: context,
    plugins: [myPlugin],
    subscriptions: {
      path: '/subscriptions',
    },
  })
  await server.start()

  const http_app = express()

  server.applyMiddleware({ app: http_app })

  // Create the HTTPS or HTTP server, per configuration
  if (config.ssl) {
    const https_app = express()
    https_app.enable('trust proxy')
    https_app.use((req, res, next) => {
      req.secure
        ? next()
        : res.redirect('https://' + req.headers.host + req.url)
    })
    server.applyMiddleware({ app: https_app })

    // Assumes certificates are in a .ssl folder off of the package root.
    // Make sure these files are secured.
    let httpsServer = https.createServer(
      {
        key: fs.readFileSync(
          `/etc/letsencrypt/live/xn--gwchs-hra.haus/privkey.pem`,
        ),
        cert: fs.readFileSync(
          `/etc/letsencrypt/live/xn--gwchs-hra.haus/fullchain.pem`,
        ),
      },
      https_app,
    )
    server.installSubscriptionHandlers(httpsServer)
    await httpsServer.listen({ port: config.https_port })
  }

  let httpServer = http.createServer(http_app)
  server.installSubscriptionHandlers(httpServer)

  await httpServer.listen({ port: config.port })

  console.log(
    '🚀 Server ready at',
    `http${config.ssl ? 's' : ''}://${config.hostname}:${config.port}${
      server.graphqlPath
    }`,
    `Subscriptions ready at ws://${config.hostname}:${config.port}${server.subscriptionsPath}`,
  )
  return { server, app: http_app }
}

startApolloServer()
