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

import { Neo4jGraphQLAuthJWTPlugin } from "@neo4j/graphql-plugin-auth";
import { gql } from "apollo-server";
import type { DocumentNode } from "graphql";
import { Neo4jGraphQL } from "../../../../../../../src";
import { createJwtRequest } from "../../../../../../utils/create-jwt-request";
import { formatCypher, translateQuery, formatParams } from "../../../../../utils/tck-test-utils";

describe("Cypher Auth Where", () => {
    const secret = "secret";
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = gql`
            interface Content
                @auth(
                    rules: [
                        {
                            operations: [READ, UPDATE, DELETE, CONNECT, DISCONNECT]
                            where: { creator: { id: "$jwt.sub" } }
                        }
                    ]
                ) {
                id: ID
                content: String
                creator: User! @relationship(type: "HAS_CONTENT", direction: IN)
            }

            type User {
                id: ID
                name: String
                content: [Content!]! @relationship(type: "HAS_CONTENT", direction: OUT)
            }

            type Comment implements Content {
                id: ID
                content: String
                creator: User!
            }

            type Post implements Content {
                id: ID
                content: String
                creator: User!
            }

            extend type User
                @auth(rules: [{ operations: [READ, UPDATE, DELETE, CONNECT, DISCONNECT], where: { id: "$jwt.sub" } }])

            extend type User {
                password: String! @auth(rules: [{ operations: [READ], where: { id: "$jwt.sub" } }])
            }

            extend type Post {
                secretKey: String! @auth(rules: [{ operations: [READ], where: { creator: { id: "$jwt.sub" } } }])
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret,
                }),
            },
        });
    });

    test("Read Node", async () => {
        const query = gql`
            {
                posts {
                    id
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE (exists((this)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $thisauth_param0)))
            RETURN this { .id } as this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\"
            }"
        `);
    });

    test("Read Node + User Defined Where", async () => {
        const query = gql`
            {
                posts(where: { content: "bob" }) {
                    id
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE (this.content = $param0 AND (exists((this)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $thisauth_param0))))
            RETURN this { .id } as this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"bob\\",
                \\"thisauth_param0\\": \\"id-01\\"
            }"
        `);
    });

    test("Read interface relationship field", async () => {
        const query = gql`
            {
                users {
                    id
                    content {
                        ... on Post {
                            id
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH *
            CALL {
            WITH this
            CALL {
                WITH this
                MATCH (this)-[thisthis0:HAS_CONTENT]->(this_Comment:\`Comment\`)
                WHERE (exists((this_Comment)<-[:HAS_CONTENT]-(:\`User\`)) AND all(thisthis1 IN [(this_Comment)<-[:HAS_CONTENT]-(thisthis1:\`User\`) | thisthis1] WHERE (thisthis1.id IS NOT NULL AND thisthis1.id = $thisparam0)))
                RETURN { __resolveType: \\"Comment\\" } AS this_content
                UNION
                WITH this
                MATCH (this)-[thisthis2:HAS_CONTENT]->(this_Post:\`Post\`)
                WHERE (exists((this_Post)<-[:HAS_CONTENT]-(:\`User\`)) AND all(thisthis3 IN [(this_Post)<-[:HAS_CONTENT]-(thisthis3:\`User\`) | thisthis3] WHERE (thisthis3.id IS NOT NULL AND thisthis3.id = $thisparam1)))
                RETURN { __resolveType: \\"Post\\", id: this_Post.id } AS this_content
            }
            RETURN collect(this_content) AS this_content
            }
            RETURN this { .id, content: this_content } as this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"thisparam0\\": \\"id-01\\",
                \\"thisparam1\\": \\"id-01\\"
            }"
        `);
    });

    test("Read interface relationship Using Connection", async () => {
        const query = gql`
            {
                users {
                    id
                    contentConnection {
                        edges {
                            node {
                                ... on Post {
                                    id
                                }
                            }
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            CALL {
                WITH this
                CALL {
                    WITH this
                    MATCH (this)-[this_connection_contentConnectionthis0:HAS_CONTENT]->(this_Comment:\`Comment\`)
                    WHERE (exists((this_Comment)<-[:HAS_CONTENT]-(:\`User\`)) AND all(this_connection_contentConnectionthis1 IN [(this_Comment)<-[:HAS_CONTENT]-(this_connection_contentConnectionthis1:\`User\`) | this_connection_contentConnectionthis1] WHERE (this_connection_contentConnectionthis1.id IS NOT NULL AND this_connection_contentConnectionthis1.id = $this_connection_contentConnectionparam0)))
                    WITH { node: { __resolveType: \\"Comment\\" } } AS edge
                    RETURN edge
                    UNION
                    WITH this
                    MATCH (this)-[this_connection_contentConnectionthis2:HAS_CONTENT]->(this_Post:\`Post\`)
                    WHERE (exists((this_Post)<-[:HAS_CONTENT]-(:\`User\`)) AND all(this_connection_contentConnectionthis3 IN [(this_Post)<-[:HAS_CONTENT]-(this_connection_contentConnectionthis3:\`User\`) | this_connection_contentConnectionthis3] WHERE (this_connection_contentConnectionthis3.id IS NOT NULL AND this_connection_contentConnectionthis3.id = $this_connection_contentConnectionparam1)))
                    WITH { node: { __resolveType: \\"Post\\", id: this_Post.id } } AS edge
                    RETURN edge
                }
                WITH collect(edge) AS edges
                WITH edges, size(edges) AS totalCount
                RETURN { edges: edges, totalCount: totalCount } AS this_contentConnection
            }
            RETURN this { .id, contentConnection: this_contentConnection } as this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_connection_contentConnectionparam0\\": \\"id-01\\",
                \\"this_connection_contentConnectionparam1\\": \\"id-01\\"
            }"
        `);
    });

    test("Read interface relationship Using Connection + User Defined Where", async () => {
        const query = gql`
            {
                users {
                    id
                    contentConnection(where: { node: { id: "some-id" } }) {
                        edges {
                            node {
                                ... on Post {
                                    id
                                }
                            }
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            CALL {
                WITH this
                CALL {
                    WITH this
                    MATCH (this)-[this_connection_contentConnectionthis0:HAS_CONTENT]->(this_Comment:\`Comment\`)
                    WHERE (this_Comment.id = $this_connection_contentConnectionparam0 AND (exists((this_Comment)<-[:HAS_CONTENT]-(:\`User\`)) AND all(this_connection_contentConnectionthis1 IN [(this_Comment)<-[:HAS_CONTENT]-(this_connection_contentConnectionthis1:\`User\`) | this_connection_contentConnectionthis1] WHERE (this_connection_contentConnectionthis1.id IS NOT NULL AND this_connection_contentConnectionthis1.id = $this_connection_contentConnectionparam1))))
                    WITH { node: { __resolveType: \\"Comment\\" } } AS edge
                    RETURN edge
                    UNION
                    WITH this
                    MATCH (this)-[this_connection_contentConnectionthis2:HAS_CONTENT]->(this_Post:\`Post\`)
                    WHERE (this_Post.id = $this_connection_contentConnectionparam2 AND (exists((this_Post)<-[:HAS_CONTENT]-(:\`User\`)) AND all(this_connection_contentConnectionthis3 IN [(this_Post)<-[:HAS_CONTENT]-(this_connection_contentConnectionthis3:\`User\`) | this_connection_contentConnectionthis3] WHERE (this_connection_contentConnectionthis3.id IS NOT NULL AND this_connection_contentConnectionthis3.id = $this_connection_contentConnectionparam3))))
                    WITH { node: { __resolveType: \\"Post\\", id: this_Post.id } } AS edge
                    RETURN edge
                }
                WITH collect(edge) AS edges
                WITH edges, size(edges) AS totalCount
                RETURN { edges: edges, totalCount: totalCount } AS this_contentConnection
            }
            RETURN this { .id, contentConnection: this_contentConnection } as this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_connection_contentConnectionparam0\\": \\"some-id\\",
                \\"this_connection_contentConnectionparam1\\": \\"id-01\\",
                \\"this_connection_contentConnectionparam2\\": \\"some-id\\",
                \\"this_connection_contentConnectionparam3\\": \\"id-01\\"
            }"
        `);
    });

    test("Update Node", async () => {
        const query = gql`
            mutation {
                updatePosts(update: { content: "Bob" }) {
                    posts {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE (exists((this)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $thisauth_param0)))
            SET this.content = $this_update_content
            WITH this
            CALL {
            	WITH this
            	MATCH (this)<-[this_creator_User_unique:HAS_CONTENT]-(:User)
            	WITH count(this_creator_User_unique) as c
            	CALL apoc.util.validate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPost.creator required', [0])
            	RETURN c AS this_creator_User_unique_ignored
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_update_content\\": \\"Bob\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Update Node + User Defined Where", async () => {
        const query = gql`
            mutation {
                updatePosts(where: { content: "bob" }, update: { content: "Bob" }) {
                    posts {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE (this.content = $param0 AND (exists((this)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $thisauth_param0))))
            SET this.content = $this_update_content
            WITH this
            CALL {
            	WITH this
            	MATCH (this)<-[this_creator_User_unique:HAS_CONTENT]-(:User)
            	WITH count(this_creator_User_unique) as c
            	CALL apoc.util.validate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPost.creator required', [0])
            	RETURN c AS this_creator_User_unique_ignored
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"bob\\",
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_update_content\\": \\"Bob\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Update Nested Node", async () => {
        const query = gql`
            mutation {
                updateUsers(update: { content: { update: { node: { id: "new-id" } } } }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	 WITH this
            WITH this
            OPTIONAL MATCH (this)-[this_has_content0_relationship:HAS_CONTENT]->(this_content0:Comment)
            WHERE (exists((this_content0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0auth_param0)))
            CALL apoc.do.when(this_content0 IS NOT NULL, \\"
            SET this_content0.id = $this_update_content0_id
            WITH this, this_content0
            CALL {
            	WITH this_content0
            	MATCH (this_content0)<-[this_content0_creator_User_unique:HAS_CONTENT]-(:User)
            	WITH count(this_content0_creator_User_unique) as c
            	CALL apoc.util.validate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDComment.creator required', [0])
            	RETURN c AS this_content0_creator_User_unique_ignored
            }
            RETURN count(*) AS _
            \\", \\"\\", {this:this, updateUsers: $updateUsers, this_content0:this_content0, auth:$auth,this_update_content0_id:$this_update_content0_id})
            YIELD value AS _
            RETURN count(*) AS update_this_Comment
            }
            CALL {
            	 WITH this
            	WITH this
            OPTIONAL MATCH (this)-[this_has_content0_relationship:HAS_CONTENT]->(this_content0:Post)
            WHERE (exists((this_content0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0auth_param0)))
            CALL apoc.do.when(this_content0 IS NOT NULL, \\"
            SET this_content0.id = $this_update_content0_id
            WITH this, this_content0
            CALL {
            	WITH this_content0
            	MATCH (this_content0)<-[this_content0_creator_User_unique:HAS_CONTENT]-(:User)
            	WITH count(this_content0_creator_User_unique) as c
            	CALL apoc.util.validate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPost.creator required', [0])
            	RETURN c AS this_content0_creator_User_unique_ignored
            }
            RETURN count(*) AS _
            \\", \\"\\", {this:this, updateUsers: $updateUsers, this_content0:this_content0, auth:$auth,this_update_content0_id:$this_update_content0_id})
            YIELD value AS _
            RETURN count(*) AS update_this_Post
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_content0auth_param0\\": \\"id-01\\",
                \\"this_update_content0_id\\": \\"new-id\\",
                \\"auth\\": {
                    \\"isAuthenticated\\": true,
                    \\"roles\\": [
                        \\"admin\\"
                    ],
                    \\"jwt\\": {
                        \\"roles\\": [
                            \\"admin\\"
                        ],
                        \\"sub\\": \\"id-01\\"
                    }
                },
                \\"updateUsers\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"content\\": [
                                {
                                    \\"update\\": {
                                        \\"node\\": {
                                            \\"id\\": \\"new-id\\"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Delete Node", async () => {
        const query = gql`
            mutation {
                deletePosts {
                    nodesDeleted
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE (exists((this)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $thisauth_param0)))
            DETACH DELETE this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\"
            }"
        `);
    });

    test("Delete Node + User Defined Where", async () => {
        const query = gql`
            mutation {
                deletePosts(where: { content: "Bob" }) {
                    nodesDeleted
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`Post\`)
            WHERE (this.content = $param0 AND (exists((this)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $thisauth_param0))))
            DETACH DELETE this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Bob\\",
                \\"thisauth_param0\\": \\"id-01\\"
            }"
        `);
    });

    test("Delete Nested Node", async () => {
        const query = gql`
            mutation {
                deleteUsers(delete: { content: { where: {} } }) {
                    nodesDeleted
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            OPTIONAL MATCH (this)-[this_content_Comment0_relationship:HAS_CONTENT]->(this_content_Comment0:Comment)
            WHERE (exists((this_content_Comment0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content_Comment0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content_Comment0auth_param0)))
            WITH this, collect(DISTINCT this_content_Comment0) as this_content_Comment0_to_delete
            CALL {
            	WITH this_content_Comment0_to_delete
            	UNWIND this_content_Comment0_to_delete AS x
            	DETACH DELETE x
            	RETURN count(x)
            }
            WITH this
            OPTIONAL MATCH (this)-[this_content_Post0_relationship:HAS_CONTENT]->(this_content_Post0:Post)
            WHERE (exists((this_content_Post0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content_Post0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content_Post0auth_param0)))
            WITH this, collect(DISTINCT this_content_Post0) as this_content_Post0_to_delete
            CALL {
            	WITH this_content_Post0_to_delete
            	UNWIND this_content_Post0_to_delete AS x
            	DETACH DELETE x
            	RETURN count(x)
            }
            DETACH DELETE this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_content_Comment0auth_param0\\": \\"id-01\\",
                \\"this_content_Post0auth_param0\\": \\"id-01\\"
            }"
        `);
    });

    test("Connect Node (from create)", async () => {
        const query = gql`
            mutation {
                createUsers(
                    input: [
                        { id: "123", name: "Bob", password: "password", content: { connect: { where: { node: {} } } } }
                    ]
                ) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            CREATE (this0:User)
            SET this0.id = $this0_id
            SET this0.name = $this0_name
            SET this0.password = $this0_password
            WITH this0
            CALL {
            	WITH this0
            	OPTIONAL MATCH (this0_content_connect0_node:Comment)
            	WHERE (exists((this0_content_connect0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this0_content_connect0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this0_content_connect0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this0_content_connect0_node) as connectedNodes, collect(this0) as parentNodes
            		UNWIND parentNodes as this0
            		UNWIND connectedNodes as this0_content_connect0_node
            		MERGE (this0)-[:HAS_CONTENT]->(this0_content_connect0_node)
            	}
            	RETURN count(*) AS connect_this0_content_connect_Comment
            }
            CALL {
            		WITH this0
            	OPTIONAL MATCH (this0_content_connect0_node:Post)
            	WHERE (exists((this0_content_connect0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this0_content_connect0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this0_content_connect0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this0_content_connect0_node) as connectedNodes, collect(this0) as parentNodes
            		UNWIND parentNodes as this0
            		UNWIND connectedNodes as this0_content_connect0_node
            		MERGE (this0)-[:HAS_CONTENT]->(this0_content_connect0_node)
            	}
            	RETURN count(*) AS connect_this0_content_connect_Post
            }
            RETURN this0
            }
            RETURN [
            this0 { .id }] AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"123\\",
                \\"this0_name\\": \\"Bob\\",
                \\"this0_password\\": \\"password\\",
                \\"this0_content_connect0_nodeauth_param0\\": \\"id-01\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Connect Node + User Defined Where (from create)", async () => {
        const query = gql`
            mutation {
                createUsers(
                    input: [
                        {
                            id: "123"
                            name: "Bob"
                            password: "password"
                            content: { connect: { where: { node: { id: "post-id" } } } }
                        }
                    ]
                ) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            CREATE (this0:User)
            SET this0.id = $this0_id
            SET this0.name = $this0_name
            SET this0.password = $this0_password
            WITH this0
            CALL {
            	WITH this0
            	OPTIONAL MATCH (this0_content_connect0_node:Comment)
            	WHERE this0_content_connect0_node.id = $this0_content_connect0_node_param0 AND (exists((this0_content_connect0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this0_content_connect0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this0_content_connect0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this0_content_connect0_node) as connectedNodes, collect(this0) as parentNodes
            		UNWIND parentNodes as this0
            		UNWIND connectedNodes as this0_content_connect0_node
            		MERGE (this0)-[:HAS_CONTENT]->(this0_content_connect0_node)
            	}
            	RETURN count(*) AS connect_this0_content_connect_Comment
            }
            CALL {
            		WITH this0
            	OPTIONAL MATCH (this0_content_connect0_node:Post)
            	WHERE this0_content_connect0_node.id = $this0_content_connect0_node_param0 AND (exists((this0_content_connect0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this0_content_connect0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this0_content_connect0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this0_content_connect0_node) as connectedNodes, collect(this0) as parentNodes
            		UNWIND parentNodes as this0
            		UNWIND connectedNodes as this0_content_connect0_node
            		MERGE (this0)-[:HAS_CONTENT]->(this0_content_connect0_node)
            	}
            	RETURN count(*) AS connect_this0_content_connect_Post
            }
            RETURN this0
            }
            RETURN [
            this0 { .id }] AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"123\\",
                \\"this0_name\\": \\"Bob\\",
                \\"this0_password\\": \\"password\\",
                \\"this0_content_connect0_node_param0\\": \\"post-id\\",
                \\"this0_content_connect0_nodeauth_param0\\": \\"id-01\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Connect Node (from update update)", async () => {
        const query = gql`
            mutation {
                updateUsers(update: { content: { connect: { where: { node: {} } } } }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	 WITH this
            WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_content0_connect0_node:Comment)
            	WHERE (exists((this_content0_connect0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0_connect0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0_connect0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this_content0_connect0_node) as connectedNodes, collect(this) as parentNodes
            		UNWIND parentNodes as this
            		UNWIND connectedNodes as this_content0_connect0_node
            		MERGE (this)-[:HAS_CONTENT]->(this_content0_connect0_node)
            	}
            	RETURN count(*) AS connect_this_content0_connect_Comment
            }
            RETURN count(*) AS update_this_Comment
            }
            CALL {
            	 WITH this
            	WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_content0_connect0_node:Post)
            	WHERE (exists((this_content0_connect0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0_connect0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0_connect0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this_content0_connect0_node) as connectedNodes, collect(this) as parentNodes
            		UNWIND parentNodes as this
            		UNWIND connectedNodes as this_content0_connect0_node
            		MERGE (this)-[:HAS_CONTENT]->(this_content0_connect0_node)
            	}
            	RETURN count(*) AS connect_this_content0_connect_Post
            }
            RETURN count(*) AS update_this_Post
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_content0_connect0_nodeauth_param0\\": \\"id-01\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Connect Node + User Defined Where (from update update)", async () => {
        const query = gql`
            mutation {
                updateUsers(update: { content: { connect: { where: { node: { id: "new-id" } } } } }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	 WITH this
            WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_content0_connect0_node:Comment)
            	WHERE this_content0_connect0_node.id = $this_content0_connect0_node_param0 AND (exists((this_content0_connect0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0_connect0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0_connect0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this_content0_connect0_node) as connectedNodes, collect(this) as parentNodes
            		UNWIND parentNodes as this
            		UNWIND connectedNodes as this_content0_connect0_node
            		MERGE (this)-[:HAS_CONTENT]->(this_content0_connect0_node)
            	}
            	RETURN count(*) AS connect_this_content0_connect_Comment
            }
            RETURN count(*) AS update_this_Comment
            }
            CALL {
            	 WITH this
            	WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_content0_connect0_node:Post)
            	WHERE this_content0_connect0_node.id = $this_content0_connect0_node_param0 AND (exists((this_content0_connect0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0_connect0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0_connect0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this_content0_connect0_node) as connectedNodes, collect(this) as parentNodes
            		UNWIND parentNodes as this
            		UNWIND connectedNodes as this_content0_connect0_node
            		MERGE (this)-[:HAS_CONTENT]->(this_content0_connect0_node)
            	}
            	RETURN count(*) AS connect_this_content0_connect_Post
            }
            RETURN count(*) AS update_this_Post
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_content0_connect0_node_param0\\": \\"new-id\\",
                \\"this_content0_connect0_nodeauth_param0\\": \\"id-01\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Connect Node (from update connect)", async () => {
        const query = gql`
            mutation {
                updateUsers(connect: { content: { where: { node: {} } } }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_connect_content0_node:Comment)
            	WHERE (exists((this_connect_content0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_connect_content0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_connect_content0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this_connect_content0_node) as connectedNodes, collect(this) as parentNodes
            		UNWIND parentNodes as this
            		UNWIND connectedNodes as this_connect_content0_node
            		MERGE (this)-[:HAS_CONTENT]->(this_connect_content0_node)
            	}
            	RETURN count(*) AS connect_this_connect_content_Comment
            }
            CALL {
            		WITH this
            	OPTIONAL MATCH (this_connect_content0_node:Post)
            	WHERE (exists((this_connect_content0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_connect_content0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_connect_content0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this_connect_content0_node) as connectedNodes, collect(this) as parentNodes
            		UNWIND parentNodes as this
            		UNWIND connectedNodes as this_connect_content0_node
            		MERGE (this)-[:HAS_CONTENT]->(this_connect_content0_node)
            	}
            	RETURN count(*) AS connect_this_connect_content_Post
            }
            WITH *
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_connect_content0_nodeauth_param0\\": \\"id-01\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Connect Node + User Defined Where (from update connect)", async () => {
        const query = gql`
            mutation {
                updateUsers(connect: { content: { where: { node: { id: "some-id" } } } }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_connect_content0_node:Comment)
            	WHERE this_connect_content0_node.id = $this_connect_content0_node_param0 AND (exists((this_connect_content0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_connect_content0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_connect_content0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this_connect_content0_node) as connectedNodes, collect(this) as parentNodes
            		UNWIND parentNodes as this
            		UNWIND connectedNodes as this_connect_content0_node
            		MERGE (this)-[:HAS_CONTENT]->(this_connect_content0_node)
            	}
            	RETURN count(*) AS connect_this_connect_content_Comment
            }
            CALL {
            		WITH this
            	OPTIONAL MATCH (this_connect_content0_node:Post)
            	WHERE this_connect_content0_node.id = $this_connect_content0_node_param0 AND (exists((this_connect_content0_node)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_connect_content0_node)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_connect_content0_nodeauth_param0)))
            	CALL {
            		WITH *
            		WITH collect(this_connect_content0_node) as connectedNodes, collect(this) as parentNodes
            		UNWIND parentNodes as this
            		UNWIND connectedNodes as this_connect_content0_node
            		MERGE (this)-[:HAS_CONTENT]->(this_connect_content0_node)
            	}
            	RETURN count(*) AS connect_this_connect_content_Post
            }
            WITH *
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_connect_content0_node_param0\\": \\"some-id\\",
                \\"this_connect_content0_nodeauth_param0\\": \\"id-01\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Disconnect Node (from update update)", async () => {
        const query = gql`
            mutation {
                updateUsers(update: { content: { disconnect: { where: {} } } }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	 WITH this
            WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)-[this_content0_disconnect0_rel:HAS_CONTENT]->(this_content0_disconnect0:Comment)
            WHERE (exists((this_content0_disconnect0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0_disconnect0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0_disconnect0auth_param0)))
            CALL {
            	WITH this_content0_disconnect0, this_content0_disconnect0_rel
            	WITH collect(this_content0_disconnect0) as this_content0_disconnect0, this_content0_disconnect0_rel
            	UNWIND this_content0_disconnect0 as x
            	DELETE this_content0_disconnect0_rel
            }
            RETURN count(*) AS disconnect_this_content0_disconnect_Comment
            }
            RETURN count(*) AS update_this_Comment
            }
            CALL {
            	 WITH this
            	WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)-[this_content0_disconnect0_rel:HAS_CONTENT]->(this_content0_disconnect0:Post)
            WHERE (exists((this_content0_disconnect0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0_disconnect0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0_disconnect0auth_param0)))
            CALL {
            	WITH this_content0_disconnect0, this_content0_disconnect0_rel
            	WITH collect(this_content0_disconnect0) as this_content0_disconnect0, this_content0_disconnect0_rel
            	UNWIND this_content0_disconnect0 as x
            	DELETE this_content0_disconnect0_rel
            }
            RETURN count(*) AS disconnect_this_content0_disconnect_Post
            }
            RETURN count(*) AS update_this_Post
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_content0_disconnect0auth_param0\\": \\"id-01\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Disconnect Node + User Defined Where (from update update)", async () => {
        const query = gql`
            mutation {
                updateUsers(update: { content: [{ disconnect: { where: { node: { id: "new-id" } } } }] }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            	 WITH this
            WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)-[this_content0_disconnect0_rel:HAS_CONTENT]->(this_content0_disconnect0:Comment)
            WHERE this_content0_disconnect0.id = $updateUsers_args_update_content0_disconnect0_where_Commentparam0 AND (exists((this_content0_disconnect0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0_disconnect0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0_disconnect0auth_param0)))
            CALL {
            	WITH this_content0_disconnect0, this_content0_disconnect0_rel
            	WITH collect(this_content0_disconnect0) as this_content0_disconnect0, this_content0_disconnect0_rel
            	UNWIND this_content0_disconnect0 as x
            	DELETE this_content0_disconnect0_rel
            }
            RETURN count(*) AS disconnect_this_content0_disconnect_Comment
            }
            RETURN count(*) AS update_this_Comment
            }
            CALL {
            	 WITH this
            	WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)-[this_content0_disconnect0_rel:HAS_CONTENT]->(this_content0_disconnect0:Post)
            WHERE this_content0_disconnect0.id = $updateUsers_args_update_content0_disconnect0_where_Postparam0 AND (exists((this_content0_disconnect0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_content0_disconnect0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_content0_disconnect0auth_param0)))
            CALL {
            	WITH this_content0_disconnect0, this_content0_disconnect0_rel
            	WITH collect(this_content0_disconnect0) as this_content0_disconnect0, this_content0_disconnect0_rel
            	UNWIND this_content0_disconnect0 as x
            	DELETE this_content0_disconnect0_rel
            }
            RETURN count(*) AS disconnect_this_content0_disconnect_Post
            }
            RETURN count(*) AS update_this_Post
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"updateUsers_args_update_content0_disconnect0_where_Commentparam0\\": \\"new-id\\",
                \\"this_content0_disconnect0auth_param0\\": \\"id-01\\",
                \\"updateUsers_args_update_content0_disconnect0_where_Postparam0\\": \\"new-id\\",
                \\"updateUsers\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"content\\": [
                                {
                                    \\"disconnect\\": [
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"id\\": \\"new-id\\"
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Disconnect Node (from update disconnect)", async () => {
        const query = gql`
            mutation {
                updateUsers(disconnect: { content: { where: {} } }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)-[this_disconnect_content0_rel:HAS_CONTENT]->(this_disconnect_content0:Comment)
            WHERE (exists((this_disconnect_content0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_disconnect_content0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_disconnect_content0auth_param0)))
            CALL {
            	WITH this_disconnect_content0, this_disconnect_content0_rel
            	WITH collect(this_disconnect_content0) as this_disconnect_content0, this_disconnect_content0_rel
            	UNWIND this_disconnect_content0 as x
            	DELETE this_disconnect_content0_rel
            }
            RETURN count(*) AS disconnect_this_disconnect_content_Comment
            }
            CALL {
            	WITH this
            OPTIONAL MATCH (this)-[this_disconnect_content0_rel:HAS_CONTENT]->(this_disconnect_content0:Post)
            WHERE (exists((this_disconnect_content0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_disconnect_content0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_disconnect_content0auth_param0)))
            CALL {
            	WITH this_disconnect_content0, this_disconnect_content0_rel
            	WITH collect(this_disconnect_content0) as this_disconnect_content0, this_disconnect_content0_rel
            	UNWIND this_disconnect_content0 as x
            	DELETE this_disconnect_content0_rel
            }
            RETURN count(*) AS disconnect_this_disconnect_content_Post
            }
            WITH *
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"this_disconnect_content0auth_param0\\": \\"id-01\\",
                \\"updateUsers\\": {
                    \\"args\\": {
                        \\"disconnect\\": {
                            \\"content\\": [
                                {
                                    \\"where\\": {}
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Disconnect Node + User Defined Where (from update disconnect)", async () => {
        const query = gql`
            mutation {
                updateUsers(disconnect: { content: { where: { node: { id: "some-id" } } } }) {
                    users {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", { sub: "id-01", roles: ["admin"] });
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:\`User\`)
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            WHERE (this.id IS NOT NULL AND this.id = $thisauth_param0)
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)-[this_disconnect_content0_rel:HAS_CONTENT]->(this_disconnect_content0:Comment)
            WHERE this_disconnect_content0.id = $updateUsers_args_disconnect_content0_where_Commentparam0 AND (exists((this_disconnect_content0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_disconnect_content0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_disconnect_content0auth_param0)))
            CALL {
            	WITH this_disconnect_content0, this_disconnect_content0_rel
            	WITH collect(this_disconnect_content0) as this_disconnect_content0, this_disconnect_content0_rel
            	UNWIND this_disconnect_content0 as x
            	DELETE this_disconnect_content0_rel
            }
            RETURN count(*) AS disconnect_this_disconnect_content_Comment
            }
            CALL {
            	WITH this
            OPTIONAL MATCH (this)-[this_disconnect_content0_rel:HAS_CONTENT]->(this_disconnect_content0:Post)
            WHERE this_disconnect_content0.id = $updateUsers_args_disconnect_content0_where_Postparam0 AND (exists((this_disconnect_content0)<-[:HAS_CONTENT]-(:\`User\`)) AND all(auth_this0 IN [(this_disconnect_content0)<-[:HAS_CONTENT]-(auth_this0:\`User\`) | auth_this0] WHERE (auth_this0.id IS NOT NULL AND auth_this0.id = $this_disconnect_content0auth_param0)))
            CALL {
            	WITH this_disconnect_content0, this_disconnect_content0_rel
            	WITH collect(this_disconnect_content0) as this_disconnect_content0, this_disconnect_content0_rel
            	UNWIND this_disconnect_content0 as x
            	DELETE this_disconnect_content0_rel
            }
            RETURN count(*) AS disconnect_this_disconnect_content_Post
            }
            WITH *
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"thisauth_param0\\": \\"id-01\\",
                \\"updateUsers_args_disconnect_content0_where_Commentparam0\\": \\"some-id\\",
                \\"this_disconnect_content0auth_param0\\": \\"id-01\\",
                \\"updateUsers_args_disconnect_content0_where_Postparam0\\": \\"some-id\\",
                \\"updateUsers\\": {
                    \\"args\\": {
                        \\"disconnect\\": {
                            \\"content\\": [
                                {
                                    \\"where\\": {
                                        \\"node\\": {
                                            \\"id\\": \\"some-id\\"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });
});
