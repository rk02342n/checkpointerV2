// @kinde/js-utils 0.30.2 publishes a broken types entry (dist/main.d.ts is
// `export {}`), so the runtime exports that reach @kinde/expo/utils via its
// `export * from "@kinde/js-utils"` are invisible to TypeScript. Declare the
// one we use. Remove this file if a js-utils update fixes its types.
declare module "@kinde/expo/utils" {
  export function getRawToken(
    tokenType?: "accessToken" | "idToken"
  ): Promise<string | null>;
}
