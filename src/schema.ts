import {makeExecutableSchema} from 'apollo-server'
import {DateTimeResolver} from 'graphql-scalars'
import {Context} from './context'
import * as fs from "fs";
import {Data} from "ws";

const typeDefs = fs.readFileSync('./graphql/schema.graphql', {encoding: 'utf-8'})

const resolvers = {
    Query: {
        getDevice: (_parent, args: { hostname: string }, context: Context) => {
            return context.prisma.device.findUnique({
                where: {hostname: args.hostname || undefined}
            })
        },
        // feed: (_parent, args: {
        //     searchString: string,
        //     skip: number,
        //     take: number,
        //     orderBy: PostOrderByUpdatedAtInput,
        // }, context: Context) => {
        //     const or = args.searchString ? {
        //         OR: [
        //             {title: {contains: args.searchString}},
        //             {content: {contains: args.searchString}}
        //         ]
        //     } : {}
        //
        //     return context.prisma.post.findMany({
        //         where: {
        //             published: true,
        //             ...or
        //         },
        //         take: args?.take,
        //         skip: args?.skip,
        //         orderBy: args?.orderBy
        //     })
        // },
    },
    Mutation: {
        addDevice: (_parent, args: { hostname: string, name: string }, context: Context) => {
            return context.prisma.device.create({
                data: {
                    hostname: args.hostname,
                    name: args.name,
                },
            })
        },
        addDatapoint: async (_parent, args: { data: Measurement }, context: Context) => {
            return context.prisma.datapoint.create({
                data: {
                    uploadedAt: args.data.uploadedAt || undefined,
                    device: {
                        connect: {
                            hostname: args.data.hostname
                        }
                    },
                    humidity: args.data.humidity,
                    light: args.data.light,
                    temperature: args.data.temperature
                },
            }).then(datapoint => {
                return {"recordID": datapoint.id, "record": datapoint}
            })

        }
    },
    DateTime: DateTimeResolver,
    Datapoint: {
        device: (parent, _args, context: Context) => {
            return context.prisma.datapoint.findUnique({
                where: {id: parent?.id}
            }).device()
        }
    },
    Device: {
        data: (parent, _args, context: Context) => {
            return context.prisma.device.findUnique({
                where: {id: parent?.id}
            }).data()
        }
    }
}

enum SortOrder {
    asc = "asc",
    desc = "desc"
}

interface PostOrderByUpdatedAtInput {
    updatedAt: SortOrder
}

interface PostCreateInput {
    title: string,
    content?: string,
}

interface Measurement {
    humidity: number,
    light: number,
    temperature: number,
    uploadedAt: Date,
    hostname: string,
}

interface Device {
    id: number,
    hostname: String,
    name: String,
    data: [Datapoint]
}

interface Datapoint {
    id: number,
    createdAt: Date,
    uploadedAt: Date,
    device: Device,
    humidity: number,
    light: number,
    temperature: number
}

interface CreatedDatapointPayload {
    recordID: number,
    record: Datapoint
}

export const schema = makeExecutableSchema({
    resolvers,
    typeDefs,
})

