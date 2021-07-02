require('dotenv').config()
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
    production: { http_port:80, https_port: 443, hostname: 'data2.gwächs.haus' },
    development: { http_port: 4001,https_port: 4000, hostname: 'localhost' },
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

  // Create the HTTPS or HTTP server, per configuration
  if (config.https_port) {
    const https_app = express()
    server.applyMiddleware({ app: https_app })

    // Assumes certificates are in a .ssl folder off of the package root.
    // Make sure these files are secured.
    let httpsServer = https.createServer(
      {
        key: fs.readFileSync(
          `${process.env.CERT_FOLDER}/privkey.pem`,
        ),
        cert: fs.readFileSync(
          `${process.env.CERT_FOLDER}/fullchain.pem`,
        ),
      },
      https_app,
    )
    server.installSubscriptionHandlers(httpsServer)
    await httpsServer.listen({ port: config.https_port })
  }

  if (config.http_port){
    const http_app = express()
    server.applyMiddleware({ app: http_app })

    // if https and http are enabled we redirect all http calls to http
    if (config.https_port){
      http_app.enable('trust proxy')
      http_app.use((req, res, next) => {
        req.secure
            ? next()
            : res.redirect('https://' + req.headers.host + req.url)
      })
    }

    let httpServer = http.createServer(http_app)
    server.installSubscriptionHandlers(httpServer)

    await httpServer.listen({ port: config.http_port })
  }


  console.log(
    '🚀 Server ready at',
    `http${config.https_port ? 's' : ''}://${config.hostname}:${config.https_port || config.http_port}${
      server.graphqlPath
    }`,
    `Subscriptions ready at ws://${config.hostname}:${config.https_port || config.http_port}${server.subscriptionsPath}`,
  )
  return { server }
}

startApolloServer()
