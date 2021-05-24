import { makeExecutableSchema } from 'apollo-server'
import { DateTimeResolver } from 'graphql-scalars'
import { Context } from './context'
import * as fs from 'fs'
const { PubSub } = require('apollo-server')

const pubsub = new PubSub()

const typeDefs = fs.readFileSync('./graphql/schema.graphql', {
  encoding: 'utf-8',
})

const resolvers = {
  Query: {
    getDevice: (_parent, args: { hostname: string }, context: Context) => {
      return context.prisma.device.findUnique({
        where: { hostname: args.hostname || undefined },
      })
    },
    getDatapoint(_parent, args: { id: number }, context: Context) {
      return context.prisma.datapoint.findUnique({
        where: { id: args.id },
      })
    },
    getDatapointsInTimeRange(
      _parent,
      args: {
        data: DatapointsTimeRangeRequest
        orderBy: OrderByUploadedAtInput
      },
      context: Context,
    ) {
      return context.prisma.datapoint.findMany({
        where: {
          device: {
            hostname: args.data.hostname,
          },
          uploadedAt: {
            gte: args.data.start,
            lt: args.data.end || new Date(),
          },
        },
        orderBy: args?.orderBy,
      })
    },
  },
  Mutation: {
    addDevice: (
      _parent,
      args: { hostname: string; name: string },
      context: Context,
    ) => {
      return context.prisma.device.create({
        data: {
          hostname: args.hostname,
          name: args.name,
        },
      })
    },
    addDatapoint: async (
      _parent,
      args: { data: Measurement },
      context: Context,
    ) => {
      return context.prisma.datapoint
        .create({
          data: {
            uploadedAt: args.data.uploadedAt || undefined,
            device: {
              connect: {
                hostname: args.data.hostname,
              },
            },
            humidity: args.data.humidity,
            light: args.data.light,
            temperature: args.data.temperature,
          },
        })
        .then((datapoint) => {
          pubsub.publish('DATAPOINT_CREATED', { datapointCreated: datapoint });
          return { recordID: datapoint.id, record: datapoint }
        })
    },
  },
  Subscription: {
    datapointCreated: {
      subscribe: () => pubsub.asyncIterator(['DATAPOINT_CREATED']),
    },
  },
  DateTime: DateTimeResolver,
  Datapoint: {
    device: (parent, _args, context: Context) => {
      return context.prisma.datapoint
        .findUnique({
          where: { id: parent?.id },
        })
        .device()
    },
  },
  Device: {
    data: (parent, _args, context: Context) => {
      return context.prisma.device
        .findUnique({
          where: { id: parent?.id },
        })
        .data()
    },
  },
}

enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

interface OrderByUploadedAtInput {
  uploadedAt: SortOrder
}

interface PostCreateInput {
  title: string
  content?: string
}

interface Measurement {
  humidity: number
  light: number
  temperature: number
  uploadedAt: Date
  hostname: string
}

interface DatapointsTimeRangeRequest {
  start: Date
  end: Date
  hostname: string
}

interface Device {
  id: number
  hostname: String
  name: String
  data: [Datapoint]
}

interface Datapoint {
  id: number
  createdAt: Date
  uploadedAt: Date
  device: Device
  humidity: number
  light: number
  temperature: number
}

interface CreatedDatapointPayload {
  recordID: number
  record: Datapoint
}

export const schema = makeExecutableSchema({
  resolvers,
  typeDefs,
})
