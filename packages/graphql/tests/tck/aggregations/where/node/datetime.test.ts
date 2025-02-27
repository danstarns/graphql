/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { gql } from "apollo-server";
import type { DocumentNode } from "graphql";
import { Neo4jGraphQL } from "../../../../../src";
import { createJwtRequest } from "../../../../utils/create-jwt-request";
import { formatCypher, translateQuery, formatParams } from "../../../utils/tck-test-utils";

describe("Cypher Aggregations where node with DateTime", () => {
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = gql`
            type User {
                someDateTime: DateTime
                someDateTimeAlias: DateTime @alias(property: "_someDateTimeAlias")
            }

            type Post {
                content: String!
                likes: [User!]! @relationship(type: "LIKES", direction: IN)
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
        });
    });

    test("EQUAL", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_EQUAL: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN aggr_node.someDateTime = $aggr_node_someDateTime_EQUAL
            \\", { this: this, aggr_node_someDateTime_EQUAL: $aggr_node_someDateTime_EQUAL })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_EQUAL\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("EQUAL with alias", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTimeAlias_EQUAL: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN aggr_node._someDateTimeAlias = $aggr_node_someDateTimeAlias_EQUAL
            \\", { this: this, aggr_node_someDateTimeAlias_EQUAL: $aggr_node_someDateTimeAlias_EQUAL })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTimeAlias_EQUAL\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("GT", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_GT: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN aggr_node.someDateTime > $aggr_node_someDateTime_GT
            \\", { this: this, aggr_node_someDateTime_GT: $aggr_node_someDateTime_GT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_GT\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("GTE", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_GTE: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN aggr_node.someDateTime >= $aggr_node_someDateTime_GTE
            \\", { this: this, aggr_node_someDateTime_GTE: $aggr_node_someDateTime_GTE })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_GTE\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("LT", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_LT: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN aggr_node.someDateTime < $aggr_node_someDateTime_LT
            \\", { this: this, aggr_node_someDateTime_LT: $aggr_node_someDateTime_LT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_LT\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("LTE", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_LTE: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN aggr_node.someDateTime <= $aggr_node_someDateTime_LTE
            \\", { this: this, aggr_node_someDateTime_LTE: $aggr_node_someDateTime_LTE })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_LTE\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MIN_EQUAL", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MIN_EQUAL: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  min(aggr_node.someDateTime) = $aggr_node_someDateTime_MIN_EQUAL
            \\", { this: this, aggr_node_someDateTime_MIN_EQUAL: $aggr_node_someDateTime_MIN_EQUAL })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MIN_EQUAL\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MIN_GT", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MIN_GT: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  min(aggr_node.someDateTime) > $aggr_node_someDateTime_MIN_GT
            \\", { this: this, aggr_node_someDateTime_MIN_GT: $aggr_node_someDateTime_MIN_GT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MIN_GT\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MIN_GTE", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MIN_GTE: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  min(aggr_node.someDateTime) >= $aggr_node_someDateTime_MIN_GTE
            \\", { this: this, aggr_node_someDateTime_MIN_GTE: $aggr_node_someDateTime_MIN_GTE })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MIN_GTE\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MIN_LT", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MIN_LT: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  min(aggr_node.someDateTime) < $aggr_node_someDateTime_MIN_LT
            \\", { this: this, aggr_node_someDateTime_MIN_LT: $aggr_node_someDateTime_MIN_LT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MIN_LT\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MIN_LTE", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MIN_LTE: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  min(aggr_node.someDateTime) <= $aggr_node_someDateTime_MIN_LTE
            \\", { this: this, aggr_node_someDateTime_MIN_LTE: $aggr_node_someDateTime_MIN_LTE })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MIN_LTE\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MAX_EQUAL", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MAX_EQUAL: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  max(aggr_node.someDateTime) = $aggr_node_someDateTime_MAX_EQUAL
            \\", { this: this, aggr_node_someDateTime_MAX_EQUAL: $aggr_node_someDateTime_MAX_EQUAL })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MAX_EQUAL\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MAX_GT", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MAX_GT: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  max(aggr_node.someDateTime) > $aggr_node_someDateTime_MAX_GT
            \\", { this: this, aggr_node_someDateTime_MAX_GT: $aggr_node_someDateTime_MAX_GT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MAX_GT\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MAX_GTE", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MAX_GTE: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  max(aggr_node.someDateTime) >= $aggr_node_someDateTime_MAX_GTE
            \\", { this: this, aggr_node_someDateTime_MAX_GTE: $aggr_node_someDateTime_MAX_GTE })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MAX_GTE\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MAX_LT", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MAX_LT: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  max(aggr_node.someDateTime) < $aggr_node_someDateTime_MAX_LT
            \\", { this: this, aggr_node_someDateTime_MAX_LT: $aggr_node_someDateTime_MAX_LT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MAX_LT\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });

    test("MAX_LTE", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { node: { someDateTime_MAX_LTE: "2021-09-25T12:51:24.037Z" } } }) {
                    content
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE apoc.cypher.runFirstColumnSingle(\\" MATCH (this)<-[aggr_edge:LIKES]-(aggr_node:User)
            RETURN  max(aggr_node.someDateTime) <= $aggr_node_someDateTime_MAX_LTE
            \\", { this: this, aggr_node_someDateTime_MAX_LTE: $aggr_node_someDateTime_MAX_LTE })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_node_someDateTime_MAX_LTE\\": {
                    \\"year\\": 2021,
                    \\"month\\": 9,
                    \\"day\\": 25,
                    \\"hour\\": 12,
                    \\"minute\\": 51,
                    \\"second\\": 24,
                    \\"nanosecond\\": 37000000,
                    \\"timeZoneOffsetSeconds\\": 0
                }
            }"
        `);
    });
});
