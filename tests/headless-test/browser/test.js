import { Neo4jGraphQL } from "@neo4j/graphql";

async function main() {
    console.log("starting test");

    const typeDefs = `
        type User {
            name: String
        }
    `;

    const neo4jGraphQL = new Neo4jGraphQL({
        typeDefs,
        driver: {},
    });

    // eslint-disable-next-line no-undef
    const element = document.getElementById("test-element");

    const printed = await neo4jGraphQL.printSchema();

    element.innerText = printed;

    console.log("test complete");
}

main();
