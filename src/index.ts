import { fs, path, plugin } from "houdini";
import * as recast from "recast";

const AST = recast.types.builders;

export default plugin("houdini-plugin-zod", async () => {
    return {
        name: "houdini-plugin-zod",
        order: "after",
        generate: async ({ config, pluginRoot }) => {
            const graphqlTypeMap = config.schema.getTypeMap();

            const enumAstNodes = Object.values(graphqlTypeMap)
                .map((type) => type.astNode)
                .filter((node) => !!node)
                .filter((node) => node.kind === "EnumTypeDefinition")
                .filter((node) => !config.isInternalEnum(node));

            const unionDefinitions = enumAstNodes.map((node) => {
                const astNode = AST.exportNamedDeclaration(
                    AST.variableDeclaration("const", [
                        AST.variableDeclarator(
                            AST.identifier(`${node.name.value}Schema`),
                            AST.callExpression(
                                AST.memberExpression(
                                    AST.identifier("z"),
                                    AST.identifier("literal")
                                ),
                                [
                                    AST.arrayExpression(
                                        node.values.map((value) =>
                                            AST.literal(value.name.value)
                                        )
                                    ),
                                ]
                            )
                        ),
                    ])
                );

                if (node.description) {
                    astNode.comments = [
                        AST.commentBlock(
                            `* ${node.description.value}`,
                            true,
                            false
                        ),
                    ];
                }

                return astNode;
            });

            const program = AST.program([
                // import { z } from "zod/v4";
                AST.importDeclaration(
                    [
                        AST.importSpecifier(
                            AST.identifier("z"),
                            AST.identifier("z")
                        ),
                    ],
                    AST.literal("zod/v4")
                ),
                // All the union definitions
                ...unionDefinitions,
            ]);

            const { code } = recast.print(program);
            if (!fs.existsSync(pluginRoot)) {
                fs.mkdirpSync(pluginRoot);
            }

            const p = path.join(pluginRoot, "enums.js");
            await fs.writeFile(p, code);
        },
        indexFile: ({ config, content, pluginRoot, exportStarFrom }) => {
            return (
                content +
                exportStarFrom({
                    module:
                        "./" +
                        path.relative(
                            config.rootDir,
                            path.join(pluginRoot, "enums.js")
                        ),
                })
            );
        },
    };
});
