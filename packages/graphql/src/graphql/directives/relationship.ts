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

import { DirectiveLocation, GraphQLDirective, GraphQLNonNull, GraphQLString } from "graphql";
import { RelationshipDirectionEnum } from "./arguments/enums/RelationshipDirection";
import { RelationshipQueryDirectionEnum } from "./arguments/enums/RelationshipQueryDirection";
import { RelationshipQueryDirectionOption } from "../../constants";

export const relationshipDirective = new GraphQLDirective({
    name: "relationship",
    description:
        "Instructs @neo4j/graphql to treat this field as a relationship. Opens up the ability to create and connect on this field.",
    locations: [DirectiveLocation.FIELD_DEFINITION],
    args: {
        type: {
            type: new GraphQLNonNull(GraphQLString),
        },
        queryDirection: {
            type: RelationshipQueryDirectionEnum,
            defaultValue: RelationshipQueryDirectionOption.DEFAULT_DIRECTED,
            description: "Valid and default directions for this relationship.",
        },
        direction: {
            type: new GraphQLNonNull(RelationshipDirectionEnum),
        },
        properties: {
            type: GraphQLString,
            description: "The name of the interface containing the properties for this relationship.",
        },
    },
});
