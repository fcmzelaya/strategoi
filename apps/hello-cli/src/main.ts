// An app that uses the shared package. The import name is the package's
// "name" field; pnpm links it from packages/hello instead of downloading it.
import { hello } from "@strategoi/hello";

const name = process.argv[2] ?? "strategoi";
console.log(hello(name));
