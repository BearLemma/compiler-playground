import * as ts from 'typescript';
import * as fs from 'fs';
import { VisitorBase, Visit } from './visitor-base';

function assert(expr: unknown, msg = "") {
    if (!expr) {
        throw new Error(msg);
    }
}

function assertEquals<T>(actual: T, expected: T, msg?: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(msg ?? `actual (${actual}) != expected (${expected})`);
    }
}

function compileSource(path: string) {
    let options: ts.CompilerOptions = {
        ...ts.getDefaultCompilerOptions(),
        ...<ts.CompilerOptions>{
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            experimentalDecorators: true,
            lib: ['lib.es2022.d.ts'],
            noLib: false,
            emitDecoratorMetadata: false,
            suppressOutputPathCheck: true,
        }
    };

    const sourceFileText = fs.readFileSync(path, 'utf8');
    let inputs: Record<string, ts.SourceFile> = {
        [path]: ts.createSourceFile(path, sourceFileText, options.target!)
    };

    const program = ts.createProgram(Object.keys(inputs), options);
    return program.emit(undefined, undefined, undefined, undefined, {
        before: [transformer(program)]
    })
}

type TransformationContext = {
    ctx: ts.TransformationContext,
    tc: ts.TypeChecker
}

const transformer: (program: ts.Program) => ts.TransformerFactory<ts.SourceFile> = (program: ts.Program) => {
    const tc = program.getTypeChecker()

    const routingTransformer: ts.TransformerFactory<ts.SourceFile> = (context: ts.TransformationContext) => {
        return sourceFile => {
            return RoutingTransformer.transform(sourceFile, {
                ctx: context,
                tc
            });
        };
    };

    return routingTransformer;
};

export class RoutingTransformer extends VisitorBase {
    private tc: ts.TypeChecker;

    constructor(private readonly ctx: TransformationContext, private readonly routeMethod: ts.Symbol) {
        super(ctx.ctx)
        this.tc = ctx.tc
    }

    static transform<T extends ts.Node>(node: T, context: TransformationContext) {
        const routeMethod = RoutingTransformer.findRouteMethod(context.tc, node)
        let transformer = new RoutingTransformer(context, routeMethod);
        return transformer.visitNode(node);
    }

    private static getMatchingNodes(parent: ts.Node, prefix: ts.SyntaxKind[]): ts.Node[] {
        if (prefix.length == 0) {
            return [parent];
        }
        const kind = prefix[0];
        const subPrefix = prefix.slice(1);
        const result: ts.Node[] = [];
        for (const node of parent.getChildren()) {
            if (node.kind == kind) {
                result.push(...this.getMatchingNodes(node, subPrefix));
            }
        }
        return result;
    }

    private static findRouteMethod(tc: ts.TypeChecker, rootNode: ts.Node): ts.Symbol {
        const exportAssignments = this.getMatchingNodes(rootNode, [ts.SyntaxKind.SyntaxList, ts.SyntaxKind.ExportAssignment]);
        assertEquals(exportAssignments.length, 1, "Found unexpected number of exports");

        const expChildren = exportAssignments[0].getChildren();
        assert(expChildren.length >= 3, "Export assignment has an unexpected number of children");
        assertEquals(expChildren[0].kind, ts.SyntaxKind.ExportKeyword);
        assertEquals(expChildren[1].kind, ts.SyntaxKind.DefaultKeyword);
        assertEquals(expChildren[2].kind, ts.SyntaxKind.Identifier);

        const ident = expChildren[2] as ts.Identifier;
        const exportedSymbol = tc.getExportSpecifierLocalTargetSymbol(ident);
        assert(exportedSymbol !== undefined, "Failed to locate default-exported identifier");

        const exportedVariable = exportedSymbol!.valueDeclaration;
        assert(exportedVariable !== undefined, "Exported variable doesn't have value declaration");

        const exportedType = tc.getTypeAtLocation(exportedVariable!);
        const exportedTypeName = exportedType.symbol.getName();
        assertEquals(exportedTypeName, "RouteMap", `Exported variable must be of type RouteMap, but got type '${exportedTypeName}'`)
        assert(exportedType.isClass(), "Exported RouteMap should be a class but isn't");

        const routeMethod = tc.getPropertyOfType(exportedType, "route");
        assert(routeMethod !== undefined, "Default-exported RouteMap type doesn't have route method");

        return routeMethod!
    }

    private analyzeRouteTypeArguments(callExpr: ts.CallExpression) {
        assert(callExpr.arguments.length === 3);
        const handlerArg = callExpr.arguments[2];

        if (handlerArg.kind === ts.SyntaxKind.ArrowFunction) {
            const arrowFunction = handlerArg as ts.ArrowFunction;
            const functionType = this.tc.getTypeAtLocation(arrowFunction);
            const callSignatures = functionType.getCallSignatures();
            console.log(functionType);

            assertEquals(callSignatures.length, 1, "Unexpected number of call signatures of Handler passed to RouteMap.route");
            const callSignature = callSignatures[0];
            console.log(this.tc.getReturnTypeOfSignature(callSignature));
        } else {
            // TODO
            assert(false);
        }
    }

    @Visit(ts.SyntaxKind.CallExpression)
    callExpr(callExpr: ts.CallExpression) {
        const expr = callExpr.expression;
        if (expr.kind == ts.SyntaxKind.PropertyAccessExpression) {
            const propertyAccess = expr as ts.PropertyAccessExpression;
            const propertyAccessSymbol = this.tc.getSymbolAtLocation(propertyAccess);
            // TODO: This is very inefficient.
            if (propertyAccessSymbol === this.routeMethod) {
                this.analyzeRouteTypeArguments(callExpr);
                const args = Array.from(callExpr.arguments);
                args.push(ts.factory.createStringLiteral("OmgWtfLol"));
                return ts.factory.updateCallExpression(this.visitEachChild(callExpr), callExpr.expression, callExpr.typeArguments, args);
            }
        } else if (expr.kind == ts.SyntaxKind.Identifier) {
            const callIdent = expr as ts.Identifier;
            const typeAtLocation = this.tc.getTypeAtLocation(callIdent);
            // TODO: .....
            return this.visitEachChild(callExpr);
        } else {
            return this.visitEachChild(callExpr);
        }
    }

}

compileSource("./examples/simple_endpoint.ts");
