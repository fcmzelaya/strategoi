// The smallest possible shared package: one function other packages can import.
export function hello(name: string): string {
  return `Hello, ${name}, from @strategoi/hello`;
}
