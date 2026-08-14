// src/invariant.ts
var PACKAGE_NAME = "dsh-open-with";
var name = "dsh-open-with-invariant";
var inject = ["invariants"];
var install = () => {
};
var apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=invariant.js.map
