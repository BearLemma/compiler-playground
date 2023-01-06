import * as ts from "typescript";

export type JsonSerializable =
    | { name: "undefined" }
    | { name: "string" }
    | { name: "number" }
    | { name: "boolean" }
    | { name: "date" }
    | { name: "arrayBuffer" }
    | { name: "array"; elementType: JsonSerializable }
    | { name: "objectType"; fields: Record<string, JsonSerializable> };

export function toJsonSerializableType(tc: ts.TypeChecker, type: ts.Type): JsonSerializable {
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
    switch (type.objectFlags) {
        case ts.ObjectFlags.Class:
        case ts.ObjectFlags.Anonymous:
        case ts.ObjectFlags.Interface:
            const symbolName = type.symbol.getName();
            if (symbolName === "Date" && type.getProperty("getTime") !== undefined) {
                return { name: "date" };
            } else if (symbolName === "Array") {
                console.log("GOT ARRAY", type);
                return { name: "array", elementType: { name: "string" } };
            } else {
                const fields: Record<string, JsonSerializable> = {};
                for (const property of type.getProperties()) {
                    const name = property.getName();
                    const propertyType = tc.getTypeAtLocation(property.valueDeclaration!);
                    console.log(propertyType);
                    if (propertyType.symbol) {
                        console.log(propertyType.symbol.getName());
                    }
                    console.log("Recursing...");
                    fields[name] = toJsonSerializableType(tc, propertyType);
                }
                return { name: "objectType", fields };
            }
        default:
            console.log(type.objectFlags);
            throw new Error(
                `Cannot convert object type '${
                    ts.ObjectFlags[type.objectFlags]
                }' to JsonSerializable. This type is not supported.`
            );
    }
}
