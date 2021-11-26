import Identifiable from "../Identifiable";

@Identifiable()
class Foo {
   public id(id?: string): string {
      return "";
   }
}

describe("Identifiable", () => {
   it(`should provide an id() method that returns a unique
   id when used a decorator for a class`, () => {
      const foo = new Foo();

      expect(typeof foo.id()).toBe("string");
      expect(foo.id().length).toBeGreaterThan(5);
   });

   it(`should change the id when set via .id('some id')`, () => {
      const foo = new Foo();
      const id = foo.id();
      foo.id("random123");
      expect(foo.id()).not.toBe(id);
      expect(foo.id()).toBe("random123");
   });
});
