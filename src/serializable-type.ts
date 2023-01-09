import * as ts from "typescript";

import { assert, assertEquals } from "./utils";

export type JsonSerializable =
    | { name: "undefined" }
    | { name: "string" }
    | { name: "number" }
    | { name: "boolean" }
    | { name: "date" }
    | { name: "arrayBuffer" }
    | { name: "array"; elementType: JsonSerializable }
    | { name: "namedObject"; typeName: string; fields: Record<string, JsonSerializable> }
    | { name: "anonymousObject"; fields: Record<string, JsonSerializable> };

export function typeToJsonSerializable(tc: ts.TypeChecker, type: ts.Type): JsonSerializable {
    switch (type.flags) {
        case ts.TypeFlags.Undefined:
            return { name: "undefined" };
        case ts.TypeFlags.String:
            return { name: "string" };
        case ts.TypeFlags.Number:
            return { name: "number" };
        case ts.TypeFlags.Boolean:
            return { name: "boolean" };
        case ts.TypeFlags.Object:
            return objectToJsonSerializable(tc, type as ts.ObjectType);
        default:
            throw new Error("TODO");
    }
}

function objectToJsonSerializable(tc: ts.TypeChecker, type: ts.ObjectType): JsonSerializable {
    if (
        type.objectFlags & (ts.ObjectFlags.EvolvingArray | ts.ObjectFlags.ArrayLiteral) &&
        type.objectFlags & ts.ObjectFlags.Reference
    ) {
        const array = type as ts.TypeReference;
        assert(array.typeArguments !== undefined, "Array must have 1 type argument but has none");

        const typeArgs = array.typeArguments!;
        assertEquals(typeArgs.length, 1, "Array must have one type argument");
        const elementType = typeArgs[0];

        return { name: "array", elementType: typeToJsonSerializable(tc, elementType) };
    } else if (type.symbol.getName() === "Date" && type.getProperty("getTime") !== undefined) {
        return { name: "date" };
    } else {
        const fields: Record<string, JsonSerializable> = {};
        for (const property of type.getProperties()) {
            const name = property.getName();
            const propertyType = tc.getTypeAtLocation(property.valueDeclaration!);
            fields[name] = typeToJsonSerializable(tc, propertyType);
        }
        if (type.objectFlags & ts.ObjectFlags.ClassOrInterface) {
            const typeName = type.symbol.getName();
            return { name: "namedObject", typeName, fields };
        } else if (type.objectFlags & ts.ObjectFlags.Anonymous) {
            return { name: "anonymousObject", fields };
        } else {
            throw new Error("Unexpected object type");
        }
    }
}
