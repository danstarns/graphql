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
import { Neo4jGraphQL } from "../../../../src";
import { createJwtRequest } from "../../../utils/create-jwt-request";
import { formatCypher, translateQuery, formatParams } from "../../utils/tck-test-utils";

describe("Cypher Aggregations where with logical AND plus OR", () => {
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = gql`
            type User {
                name: String!
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

    test("AND", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { AND: [{ count_GT: 10 }, { count_LT: 20 }] } }) {
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
            RETURN (count(aggr_node) > $aggr_AND_0_count_GT AND count(aggr_node) < $aggr_AND_1_count_LT)
            \\", { this: this, aggr_AND_0_count_GT: $aggr_AND_0_count_GT, aggr_AND_1_count_LT: $aggr_AND_1_count_LT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_AND_0_count_GT\\": {
                    \\"low\\": 10,
                    \\"high\\": 0
                },
                \\"aggr_AND_1_count_LT\\": {
                    \\"low\\": 20,
                    \\"high\\": 0
                }
            }"
        `);
    });

    test("OR", async () => {
        const query = gql`
            {
                posts(where: { likesAggregate: { OR: [{ count_GT: 10 }, { count_LT: 20 }] } }) {
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
            RETURN (count(aggr_node) > $aggr_OR_0_count_GT OR count(aggr_node) < $aggr_OR_1_count_LT)
            \\", { this: this, aggr_OR_0_count_GT: $aggr_OR_0_count_GT, aggr_OR_1_count_LT: $aggr_OR_1_count_LT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_OR_0_count_GT\\": {
                    \\"low\\": 10,
                    \\"high\\": 0
                },
                \\"aggr_OR_1_count_LT\\": {
                    \\"low\\": 20,
                    \\"high\\": 0
                }
            }"
        `);
    });

    test("AND plus OR", async () => {
        const query = gql`
            {
                posts(
                    where: {
                        likesAggregate: {
                            AND: [{ count_GT: 10 }, { count_LT: 20 }]
                            OR: [{ count_GT: 10 }, { count_LT: 20 }]
                        }
                    }
                ) {
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
            RETURN (count(aggr_node) > $aggr_AND_0_count_GT AND count(aggr_node) < $aggr_AND_1_count_LT) AND (count(aggr_node) > $aggr_OR_0_count_GT OR count(aggr_node) < $aggr_OR_1_count_LT)
            \\", { this: this, aggr_AND_0_count_GT: $aggr_AND_0_count_GT, aggr_AND_1_count_LT: $aggr_AND_1_count_LT, aggr_OR_0_count_GT: $aggr_OR_0_count_GT, aggr_OR_1_count_LT: $aggr_OR_1_count_LT })
            RETURN this { .content } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"aggr_AND_0_count_GT\\": {
                    \\"low\\": 10,
                    \\"high\\": 0
                },
                \\"aggr_AND_1_count_LT\\": {
                    \\"low\\": 20,
                    \\"high\\": 0
                },
                \\"aggr_OR_0_count_GT\\": {
                    \\"low\\": 10,
                    \\"high\\": 0
                },
                \\"aggr_OR_1_count_LT\\": {
                    \\"low\\": 20,
                    \\"high\\": 0
                }
            }"
        `);
    });
});
